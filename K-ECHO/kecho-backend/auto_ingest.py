"""Independent K-ECHO batch worker; approved subtitle exports are the default.

Usage:
    python auto_ingest.py                       # offline approved sources (cron / launchd)
    python auto_ingest.py --loop-hours 6        # keep running, one pass every 6 hours
    python auto_ingest.py --source-mode legacy --no-discover

Approved mode imports only local sources listed in --approved-sources.
Legacy mode discovers clips and drains the old queue with quota/backoff limits.
Both modes acquire a DB advisory lock and process at most --max-ingest videos.
"""

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
from urllib.error import HTTPError

import psycopg

import pipeline
from approved_subtitles import ApprovedVideo, load_sources
from batch_ingest import load_jobs, print_db_report, setup_logging
from youtube_quota import YouTubeQuotaExceeded, quota_reset_seconds

log = logging.getLogger("kecho.batch")
HERE = Path(__file__).parent
SCHEDULER_STATE = "youtube_discovery"
BATCH_LOCK_ID = 1262830408


def ensure_scheduler_state(conn: psycopg.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS ingest_scheduler_state (
            name TEXT PRIMARY KEY,
            consecutive_blocks INT NOT NULL DEFAULT 0,
            retry_after TIMESTAMPTZ,
            last_error TEXT,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    conn.execute(
        "INSERT INTO ingest_scheduler_state (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
        (SCHEDULER_STATE,),
    )
    conn.commit()


def discovery_retry_after(conn: psycopg.Connection):
    ensure_scheduler_state(conn)
    return conn.execute(
        "SELECT retry_after FROM ingest_scheduler_state WHERE name = %s",
        (SCHEDULER_STATE,),
    ).fetchone()[0]


def record_discovery_block(conn: psycopg.Connection, error: str) -> int:
    ensure_scheduler_state(conn)
    attempts = conn.execute(
        """
        UPDATE ingest_scheduler_state
           SET consecutive_blocks = consecutive_blocks + 1,
               updated_at = now(),
               last_error = %s
         WHERE name = %s
        RETURNING consecutive_blocks
        """,
        (error[:500], SCHEDULER_STATE),
    ).fetchone()[0]
    delay = pipeline.retry_delay_seconds(attempts)
    exhausted = attempts >= pipeline.MAX_INGEST_ATTEMPTS
    if exhausted:
        delay = pipeline.RETRY_MAX_SECONDS
    conn.execute(
        """
        UPDATE ingest_scheduler_state
           SET retry_after = now() + make_interval(secs => %s),
               consecutive_blocks = CASE WHEN %s THEN 0 ELSE consecutive_blocks END
         WHERE name = %s
        """,
        (delay, exhausted, SCHEDULER_STATE),
    )
    conn.commit()
    return delay


def clear_discovery_block(conn: psycopg.Connection) -> None:
    ensure_scheduler_state(conn)
    conn.execute(
        """
        UPDATE ingest_scheduler_state
           SET consecutive_blocks = 0, retry_after = NULL, last_error = NULL, updated_at = now()
         WHERE name = %s
        """,
        (SCHEDULER_STATE,),
    )
    conn.commit()


def queue_new_work(dsn: str, watchlist: list[str], jobs_file: Path | None, per_drama: int, discover: bool) -> bool:
    with psycopg.connect(dsn) as conn:
        requeued = pipeline.requeue_stale(conn)
        if requeued:
            log.info(f"재시도 대기열로 복귀: {requeued}개")

        if jobs_file and jobs_file.exists():
            for job in load_jobs(jobs_file):
                pipeline.enqueue(conn, job["youtube_video_id"], job["drama_title"], "manual")

        if not discover:
            return False
        retry_after = discovery_retry_after(conn)
        if retry_after and retry_after > pipeline.datetime_now_utc():
            log.info(f"YouTube 검색 차단 쿨다운 중: {retry_after.isoformat()}")
            return True
        blocked = False
        for drama in watchlist:
            try:
                clips = pipeline.discover(drama, max_results=per_drama)
            except pipeline.DiscoveryUnavailable:
                log.warning("YOUTUBE_API_KEY가 없어 자동 검색을 건너뜁니다 (.env에 추가하세요)")
                return False
            except YouTubeQuotaExceeded:
                delay = quota_reset_seconds()
                ensure_scheduler_state(conn)
                conn.execute(
                    "UPDATE ingest_scheduler_state SET retry_after = now() + make_interval(secs => %s),"
                    " last_error = 'daily quota exhausted', updated_at = now() WHERE name = %s",
                    (delay, SCHEDULER_STATE),
                )
                conn.commit()
                log.warning("YouTube 일일 예산 소진; %s초 후 재개합니다.", delay)
                return True
            except HTTPError as exc:
                if exc.code == 429:
                    delay = record_discovery_block(conn, f"HTTP {exc.code}: YouTube API rate limited")
                    exhausted = False
                    with psycopg.connect(dsn) as state_conn:
                        attempts = state_conn.execute(
                            "SELECT consecutive_blocks FROM ingest_scheduler_state WHERE name = %s",
                            (SCHEDULER_STATE,),
                        ).fetchone()[0]
                    exhausted = attempts == 0
                    suffix = "최대 재시도 횟수에 도달해" if exhausted else ""
                    log.warning(f"YouTube 검색 제한(HTTP 429). {suffix} {delay}초 쿨다운 후 재시도합니다.")
                    blocked = True
                    break
                log.error(f"[검색 실패] {drama}: HTTPError {exc.code}")
                continue
            except Exception as exc:  # quota exceeded, network error, ...
                log.error(f"[검색 실패] {drama}: {type(exc).__name__}: {exc}")
                continue
            for clip in clips:
                job = pipeline.enqueue(conn, clip["video_id"], drama, "scheduler")
                log.info(f"[발견] {drama} {clip['video_id']} ({clip['channel']}) -> {job['status']}")
        if not blocked:
            clear_discovery_block(conn)
        return blocked


def drain_queue(
    dsn: str, max_ingest: int, delay: float, priority_titles: list[str],
    sources: dict[str, ApprovedVideo] | None = None,
) -> dict[str, int]:
    counts = {"done": 0, "failed": 0, "blocked": 0, "skipped": 0}
    with psycopg.connect(dsn) as conn:
        video_ids = pipeline.queued_ids(conn, max_ingest, priority_titles, list(sources) if sources is not None else None)
    for i, video_id in enumerate(video_ids, 1):
        if sources is None:
            status = pipeline.run_job(dsn, video_id)
        else:
            source = sources[video_id]
            log.info("[승인 자막] %s rights_reference=%s", video_id, source.rights_reference)
            status = pipeline.run_job(dsn, video_id, ingest_fn=source.ingest, check_embedding=False)
        counts[status] += 1
        log.info(f"[{i}/{len(video_ids)}] {video_id} -> {status}")
        if status == "blocked":
            log.warning("YouTube가 요청을 차단했습니다. 남은 작업은 다음 실행에서 이어갑니다.")
            break
        if i < len(video_ids) and delay > 0:
            time.sleep(delay)
    return counts


def run_once(args: argparse.Namespace, dsn: str) -> None:
    with psycopg.connect(dsn, autocommit=True) as lock_conn:
        acquired = lock_conn.execute("SELECT pg_try_advisory_lock(%s)", (BATCH_LOCK_ID,)).fetchone()[0]
        if not acquired:
            log.info("다른 수집 배치가 실행 중이므로 이번 실행을 건너뜁니다.")
            return
        try:
            run_batch(args, dsn)
        finally:
            lock_conn.execute("SELECT pg_advisory_unlock(%s)", (BATCH_LOCK_ID,))


def run_batch(args: argparse.Namespace, dsn: str) -> None:
    if args.source_mode == "approved":
        sources = load_sources(args.approved_sources)
        with psycopg.connect(dsn) as conn:
            pipeline.requeue_stale(conn)
            for source in sources.values():
                pipeline.enqueue(conn, source.video_id, source.drama_title, "manual")
        counts = drain_queue(dsn, args.max_ingest, args.delay, [], sources)
        log.info("=== 승인 자막 수집 결과: %s ===", counts)
        print_db_report(dsn)
        return
    watchlist = json.loads(args.watchlist.read_text(encoding="utf-8"))
    log.info(f"=== 자동 수집 시작: 드라마 {len(watchlist)}개 ===")
    cooldown = queue_new_work(dsn, watchlist, args.jobs, args.per_drama, not args.no_discover)
    if cooldown:
        counts = {"done": 0, "failed": 0, "blocked": 0, "skipped": 0}
        log.info("쿨다운 중이므로 대기열 처리를 보류합니다.")
    else:
        counts = drain_queue(dsn, args.max_ingest, args.delay, watchlist)
    log.info(f"=== 결과: {counts} ===")
    print_db_report(dsn)


def main() -> int:
    parser = argparse.ArgumentParser(description="Discover, queue and ingest official K-drama clips")
    parser.add_argument("--source-mode", choices=("approved", "legacy"), default="approved")
    parser.add_argument("--approved-sources", type=Path, default=HERE / "approved_sources.json")
    parser.add_argument("--youtube-daily-budget", type=int, default=int(os.environ.get("KECHO_YOUTUBE_DAILY_BUDGET", "1000")))
    parser.add_argument("--watchlist", type=Path, default=HERE / "watchlist.json")
    parser.add_argument("--jobs", type=Path, default=HERE / "jobs.json", help="manual job list to queue as well")
    parser.add_argument("--per-drama", type=int, default=2, help="new clips to queue per drama per run")
    parser.add_argument("--max-ingest", type=int, default=5, help="videos to ingest per run (YouTube rate limits)")
    parser.add_argument("--delay", type=float, default=10.0, help="seconds between videos")
    parser.add_argument("--no-discover", action="store_true")
    parser.add_argument("--loop-hours", type=float, default=0, help="repeat every N hours (0 = run once)")
    parser.add_argument("--log", type=Path, default=HERE / "logs/auto_ingest.log")
    args = parser.parse_args()
    if args.max_ingest < 1 or args.per_drama < 1 or args.delay < 0 or args.loop_hours < 0 or args.youtube_daily_budget < 0:
        parser.error("Counts must be positive; delay, loop-hours and quota budget must be nonnegative")
    os.environ["KECHO_YOUTUBE_DAILY_BUDGET"] = str(args.youtube_daily_budget)

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        parser.error("DATABASE_URL is required (env or .env)")
    setup_logging(args.log)

    while True:
        try:
            run_once(args, dsn)
        except Exception:
            if not args.loop_hours:
                raise
            log.exception("자동 수집 실행 중 오류; 다음 주기에 다시 시도합니다")
        if not args.loop_hours:
            return 0
        log.info(f"다음 실행까지 {args.loop_hours}시간 대기")
        sleep_seconds = args.loop_hours * 3600
        with psycopg.connect(dsn) as conn:
            retry_after = discovery_retry_after(conn) if args.source_mode == "legacy" else None
            if retry_after:
                seconds = (retry_after - pipeline.datetime_now_utc()).total_seconds()
                if seconds > 0:
                    sleep_seconds = min(sleep_seconds, seconds)
            job_retry = conn.execute(
                """
                SELECT min(greatest(0, extract(epoch FROM updated_at
                    + make_interval(secs => least(%s * power(2, attempts - 1), %s)) - now())))
                  FROM ingest_jobs
                 WHERE status = 'blocked' AND attempts < %s
                """,
                (pipeline.RETRY_BASE_SECONDS, pipeline.RETRY_MAX_SECONDS, pipeline.MAX_INGEST_ATTEMPTS),
            ).fetchone()[0]
            if job_retry is not None and job_retry > 0:
                sleep_seconds = min(sleep_seconds, float(job_retry))
        log.info(f"다음 실행까지 {sleep_seconds:.0f}초 대기")
        time.sleep(max(1, sleep_seconds))


if __name__ == "__main__":
    sys.exit(main())
