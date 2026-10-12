"""K-ECHO batch subtitle ingestion.

Usage:
    export DATABASE_URL=postgresql://user:pass@localhost:5432/kecho
    python batch_ingest.py jobs.json [--delay 2] [--log logs/batch_ingest.log] [--skip-existing]

jobs.json: [{"youtube_video_id": "...", "drama_title": "..."}, ...]
"""

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path

import psycopg

from ingest import IngestError, ingest_video

log = logging.getLogger("kecho.batch")


def setup_logging(log_path: Path) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(fmt)
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(logging.Formatter("%(message)s"))
    log.addHandler(file_handler)
    log.addHandler(console)
    log.setLevel(logging.INFO)


def load_jobs(path: Path) -> list[dict]:
    jobs = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(jobs, list) or not all(
        isinstance(j, dict) and j.get("youtube_video_id") and j.get("drama_title") for j in jobs
    ):
        raise ValueError("jobs file must be a list of {youtube_video_id, drama_title} objects")
    return jobs


def print_db_report(dsn: str) -> None:
    with psycopg.connect(dsn) as conn:
        videos, subtitles, dramas = conn.execute(
            "SELECT (SELECT count(*) FROM videos), (SELECT count(*) FROM subtitles),"
            " (SELECT count(DISTINCT drama_title) FROM videos)"
        ).fetchone()
        per_drama = conn.execute(
            """
            SELECT v.drama_title, count(DISTINCT v.id) AS videos, count(s.id) AS lines
              FROM videos v
              LEFT JOIN subtitles s ON s.video_id = v.id
             GROUP BY v.drama_title
             ORDER BY lines DESC, v.drama_title
            """
        ).fetchall()

    log.info("")
    log.info("=== DB 누적 통계 ===")
    log.info(f"드라마 {dramas}개 / 영상 {videos}개 / 대사 {subtitles}개")
    for title, n_videos, n_lines in per_drama:
        log.info(f"  - {title}: 영상 {n_videos}개, 대사 {n_lines}개")


def main() -> int:
    parser = argparse.ArgumentParser(description="Batch-ingest YouTube subtitles into K-ECHO DB")
    parser.add_argument("jobs_file", type=Path)
    parser.add_argument("--delay", type=float, default=2.0, help="seconds between videos (rate-limit courtesy)")
    parser.add_argument("--log", type=Path, default=Path("logs/batch_ingest.log"))
    parser.add_argument(
        "--skip-existing", action="store_true", help="skip videos that already have subtitles in the DB"
    )
    args = parser.parse_args()

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        parser.error("DATABASE_URL environment variable is required")

    setup_logging(args.log)
    try:
        jobs = load_jobs(args.jobs_file)
    except (OSError, ValueError) as exc:
        parser.error(f"cannot read jobs file: {exc}")

    if args.skip_existing:
        with psycopg.connect(dsn) as conn:
            existing = {
                row[0]
                for row in conn.execute(
                    "SELECT DISTINCT v.youtube_video_id FROM videos v JOIN subtitles s ON s.video_id = v.id"
                )
            }
        skipped = [j for j in jobs if j["youtube_video_id"] in existing]
        jobs = [j for j in jobs if j["youtube_video_id"] not in existing]
        if skipped:
            log.info(f"=== 이미 수집된 영상 {len(skipped)}개 건너뜀 ===")

    succeeded, failed = [], []
    log.info(f"=== 배치 수집 시작: {len(jobs)}개 영상 ===")

    for i, job in enumerate(jobs, 1):
        vid, drama = job["youtube_video_id"], job["drama_title"]
        prefix = f"[{i}/{len(jobs)}] {vid} ({drama})"
        try:
            result = ingest_video(dsn, vid, drama)
        except IngestError as exc:
            log.error(f"{prefix} 실패 - {exc}")
            failed.append((vid, drama, str(exc)))
        except Exception as exc:  # keep the batch alive on unexpected network/DB errors
            log.exception(f"{prefix} 예상치 못한 오류 - {type(exc).__name__}: {exc}")
            failed.append((vid, drama, f"{type(exc).__name__}: {exc}"))
        else:
            log.info(f"{prefix} 성공 - 제목: {result['title']} / 대사 {result['segments']}개")
            succeeded.append((vid, drama, result))

        if i < len(jobs) and args.delay > 0:
            time.sleep(args.delay)

    log.info("")
    log.info(f"=== 배치 결과: 성공 {len(succeeded)} / 실패 {len(failed)} ===")
    for vid, drama, result in succeeded:
        log.info(f"  [OK]   {vid} {drama} - {result['title']} ({result['segments']}개)")
    for vid, drama, reason in failed:
        log.info(f"  [FAIL] {vid} {drama} - {reason}")

    print_db_report(dsn)
    log.info(f"로그 파일: {args.log.resolve()}")
    return 0 if succeeded or not jobs else 1


if __name__ == "__main__":
    sys.exit(main())
