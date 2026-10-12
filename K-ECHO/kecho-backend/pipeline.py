"""K-ECHO background ingestion pipeline. Never imported by the search API.

- discover(): finds official K-drama clips via the YouTube Data API (needs YOUTUBE_API_KEY).
- ingest_jobs table: a DB-backed queue; claim_job() makes concurrent workers safe.
- run_job(): subtitle fetch + DeepL translation via ingest.ingest_video().
"""

import json
import logging
import os
import re
import urllib.parse
import urllib.request
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError

import psycopg
from dotenv import load_dotenv
from youtube_transcript_api import IpBlocked, RequestBlocked

from ingest import VIDEO_ID_RE, IngestError, fetch_metadata, ingest_video
from youtube_quota import YouTubeQuotaExceeded, reserve_quota

load_dotenv(Path(__file__).with_name(".env"))

log = logging.getLogger("kecho.pipeline")


def datetime_now_utc() -> datetime:
    return datetime.now(timezone.utc)

DEFAULT_OFFICIAL_CHANNELS = (
    "tvN DRAMA,tvN D ENT,디글 :Diggle,디글 클래식 :Diggle Classic,"
    "KBS Drama,KBS Drama Classic,KBS WORLD TV,SBS Drama,SBS NOW / SBS 공식 채널,SBS Catch,"
    "MBCdrama,MBC드라마,JTBC Drama,JTBC Entertainment,ENA 이엔에이,Netflix Korea 넷플릭스 코리아"
)
# Legacy discovery is restricted to these channels.
OFFICIAL_CHANNELS = {
    c.strip().casefold()
    for c in os.environ.get("KECHO_OFFICIAL_CHANNELS", DEFAULT_OFFICIAL_CHANNELS).split(",")
    if c.strip()
}

YOUTUBE_URL_RE = re.compile(
    r"(?:youtube\.com/(?:watch\?(?:[^#\s]*&)?v=|embed/|shorts/|live/)|youtu\.be/)([A-Za-z0-9_-]{11})"
)
ISO_DURATION_RE = re.compile(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$")
MIN_CLIP_SEC, MAX_CLIP_SEC = 120, 60 * 60
STALE_RUNNING_MIN = 60
MAX_INGEST_ATTEMPTS = 5
RETRY_BASE_SECONDS = 300
RETRY_MAX_SECONDS = 6 * 60 * 60


def retry_delay_seconds(attempts: int) -> int:
    """Exponential retry delay after a transient block, capped at six hours."""
    exponent = max(0, attempts - 1)
    return min(RETRY_BASE_SECONDS * (2**exponent), RETRY_MAX_SECONDS)


class DiscoveryUnavailable(RuntimeError):
    """YOUTUBE_API_KEY is not configured."""


class NotOfficialChannel(ValueError):
    pass


class NotEmbeddableVideo(ValueError):
    pass


def parse_video_id(value: str) -> str | None:
    value = value.strip()
    if VIDEO_ID_RE.match(value):
        return value
    match = YOUTUBE_URL_RE.search(value)
    return match.group(1) if match else None


def is_official_channel(channel: str | None) -> bool:
    return bool(channel) and channel.strip().casefold() in OFFICIAL_CHANNELS


def compact(text: str) -> str:
    return "".join(text.split()).casefold()


# --- discovery -----------------------------------------------------------------------------------


def _youtube_api(endpoint: str, params: dict) -> dict:
    key = os.environ.get("YOUTUBE_API_KEY")
    if not key:
        raise DiscoveryUnavailable("YOUTUBE_API_KEY is not set")
    reserve_quota(
        os.environ["DATABASE_URL"],
        100 if endpoint == "search" else 1,
        int(os.environ.get("KECHO_YOUTUBE_DAILY_BUDGET", "1000")),
    )
    url = f"https://www.googleapis.com/youtube/v3/{endpoint}?" + urllib.parse.urlencode({**params, "key": key})
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            return json.load(resp)
    except HTTPError as exc:
        if exc.code == 403:
            try:
                error = json.loads(exc.read())
                reasons = {item.get("reason") for item in error.get("error", {}).get("errors", [])}
            except (ValueError, AttributeError):
                reasons = set()
            if reasons & {"quotaExceeded", "dailyLimitExceeded"}:
                raise YouTubeQuotaExceeded("YouTube project daily quota exhausted") from exc
        raise


def _duration_sec(iso: str) -> int:
    match = ISO_DURATION_RE.match(iso or "")
    if not match:
        return 0
    h, m, s = (int(g or 0) for g in match.groups())
    return h * 3600 + m * 60 + s


def _discover(query: str, max_results: int, required_title: str | None) -> list[dict]:
    found = _youtube_api(
        "search",
        {
            "part": "snippet",
            "q": query,
            "type": "video",
            "regionCode": "KR",
            "relevanceLanguage": "ko",
            "videoEmbeddable": "true",
            "maxResults": 25,
        },
    )
    wanted = compact(required_title) if required_title else None
    candidates = {
        item["id"]["videoId"]: item["snippet"]
        for item in found.get("items", [])
        if is_official_channel(item["snippet"].get("channelTitle"))
        and (wanted is None or wanted in compact(item["snippet"].get("title", "")))
    }
    if not candidates:
        return []

    details = _youtube_api("videos", {"part": "contentDetails,status", "id": ",".join(candidates)})
    clips = []
    for item in details.get("items", []):
        seconds = _duration_sec(item["contentDetails"].get("duration", ""))
        if item["status"].get("embeddable") and MIN_CLIP_SEC <= seconds <= MAX_CLIP_SEC:
            snippet = candidates[item["id"]]
            clips.append({"video_id": item["id"], "title": snippet["title"], "channel": snippet["channelTitle"]})
    return clips[:max_results]


def discover(drama_title: str, max_results: int = 2) -> list[dict]:
    """Official, embeddable recap/highlight clips whose title mentions the drama."""
    return _discover(f"{drama_title} 요약 몰아보기", max_results, drama_title)


def discover_keyword(keyword: str, max_results: int = 2) -> list[dict]:
    """Official, embeddable Korean clips relevant to a missing subtitle search term."""
    return _discover(keyword, max_results, None)


def is_embeddable(video_id: str) -> bool:
    """Check YouTube's current external-player permission for a video."""
    response = _youtube_api("videos", {"part": "status", "id": video_id})
    return any(item["id"] == video_id and item.get("status", {}).get("embeddable") for item in response.get("items", []))


def check_official(video_id: str) -> tuple[str, str]:
    """Check availability, official channel, and external-player permission."""
    title, channel = fetch_metadata(video_id)
    if not title:
        raise IngestError("video is unavailable or private")
    if not is_official_channel(channel):
        raise NotOfficialChannel(f"'{channel}' is not an allowlisted official channel")
    if not is_embeddable(video_id):
        raise NotEmbeddableVideo("영상 소유자가 외부 사이트 재생을 허용하지 않았습니다.")
    return title, channel


def guess_drama_title(video_title: str, known_titles: list[str]) -> str:
    haystack = compact(video_title)
    for title in sorted(known_titles, key=len, reverse=True):
        if compact(title) in haystack:
            return title
    return video_title[:60]


# --- job queue -----------------------------------------------------------------------------------


JOB_COLUMNS = "youtube_video_id, drama_title, source, status, attempts, segments, last_error, updated_at"


def get_job(conn: psycopg.Connection, video_id: str) -> dict | None:
    row = conn.execute(f"SELECT {JOB_COLUMNS} FROM ingest_jobs WHERE youtube_video_id = %s", (video_id,)).fetchone()
    return dict(zip(JOB_COLUMNS.split(", "), row)) if row else None


def enqueue(conn: psycopg.Connection, video_id: str, drama_title: str, source: str) -> dict:
    """Queue a video once. Already-ingested videos are recorded as done; blocked jobs are re-queued."""
    already = conn.execute(
        "SELECT count(*) FROM subtitles s JOIN videos v ON v.id = s.video_id WHERE v.youtube_video_id = %s",
        (video_id,),
    ).fetchone()[0]
    conn.execute(
        """
        INSERT INTO ingest_jobs (youtube_video_id, drama_title, source, status, segments)
        VALUES (%(vid)s, %(drama)s, %(source)s, %(status)s, %(segments)s)
        ON CONFLICT (youtube_video_id) DO UPDATE
           SET status = 'queued', updated_at = now()
         WHERE ingest_jobs.status = 'blocked'
        """,
        {
            "vid": video_id,
            "drama": drama_title,
            "source": source,
            "status": "done" if already else "queued",
            "segments": already or None,
        },
    )
    conn.commit()
    return get_job(conn, video_id)


def claim_job(conn: psycopg.Connection, video_id: str) -> dict | None:
    """Atomically move one queued job to running so two workers never ingest the same video."""
    row = conn.execute(
        """
        UPDATE ingest_jobs SET status = 'running', attempts = attempts + 1, updated_at = now()
         WHERE youtube_video_id = %s AND status = 'queued'
        RETURNING drama_title
        """,
        (video_id,),
    ).fetchone()
    conn.commit()
    return {"youtube_video_id": video_id, "drama_title": row[0]} if row else None


def queued_ids(
    conn: psycopg.Connection,
    limit: int,
    priority_titles: list[str] | None = None,
    allowed_ids: list[str] | None = None,
) -> list[str]:
    rows = conn.execute(
        """
        SELECT youtube_video_id FROM ingest_jobs
         WHERE status = 'queued'
                     AND (%s::text[] IS NULL OR youtube_video_id = ANY(%s::text[]))
                 ORDER BY array_position(%s::text[], drama_title) ASC NULLS LAST,
                  updated_at
         LIMIT %s
        """,
        (allowed_ids, allowed_ids, priority_titles or [], limit),
    ).fetchall()
    return [r[0] for r in rows]


def requeue_stale(conn: psycopg.Connection) -> int:
    """Requeue due transient blocks and stale workers; permanently fail exhausted jobs."""
    conn.execute(
        """
        UPDATE ingest_jobs
           SET status = 'failed',
               last_error = coalesce(last_error, '최대 재시도 횟수 초과'),
               updated_at = now()
         WHERE status = 'blocked' AND attempts >= %s
        """,
        (MAX_INGEST_ATTEMPTS,),
    )
    cur = conn.execute(
        """
        UPDATE ingest_jobs SET status = 'queued', updated_at = now()
         WHERE (status = 'blocked' AND attempts < %s
                AND updated_at <= now() - make_interval(secs => least(%s * power(2, attempts - 1), %s)))
            OR (status = 'running' AND updated_at < now() - make_interval(mins => %s))
        """,
        (MAX_INGEST_ATTEMPTS, RETRY_BASE_SECONDS, RETRY_MAX_SECONDS, STALE_RUNNING_MIN),
    )
    conn.commit()
    return cur.rowcount


def requeue_job_if_due(conn: psycopg.Connection, video_id: str) -> bool:
    """Requeue one blocked job after its backoff, unless its retry budget is exhausted."""
    job = get_job(conn, video_id)
    if not job or job["status"] != "blocked":
        return False
    if job["attempts"] >= MAX_INGEST_ATTEMPTS:
        _finish(conn, video_id, "failed", None, job["last_error"] or "최대 재시도 횟수 초과")
        return False
    cur = conn.execute(
        """
        UPDATE ingest_jobs SET status = 'queued', updated_at = now()
         WHERE youtube_video_id = %s AND status = 'blocked'
           AND updated_at <= now() - make_interval(secs => %s)
        """,
        (video_id, retry_delay_seconds(job["attempts"])),
    )
    conn.commit()
    return cur.rowcount == 1


def _finish(conn: psycopg.Connection, video_id: str, status: str, segments: int | None, error: str | None) -> None:
    conn.execute(
        "UPDATE ingest_jobs SET status = %s, segments = %s, last_error = %s, updated_at = now()"
        " WHERE youtube_video_id = %s",
        (status, segments, error, video_id),
    )
    conn.commit()


def run_job(
    dsn: str,
    video_id: str,
    *,
    ingest_fn: Callable[[str, str, str], dict] = ingest_video,
    check_embedding: bool = True,
) -> str:
    """Ingest one queued job. Returns the final status ('done' / 'failed' / 'blocked'), or 'skipped'."""
    with psycopg.connect(dsn) as conn:
        job = claim_job(conn, video_id)
        if job is None:
            return "skipped"
        try:
            if check_embedding and not is_embeddable(video_id):
                _finish(conn, video_id, "failed", None, "영상 소유자가 외부 사이트 재생을 허용하지 않았습니다.")
                return "failed"
            result = ingest_fn(dsn, video_id, job["drama_title"])
        except IngestError as exc:
            blocked = isinstance(exc.__cause__, (IpBlocked, RequestBlocked))
            status = "blocked" if blocked else "failed"
            _finish(conn, video_id, status, None, str(exc).splitlines()[0][:500])
            return status
        except Exception as exc:  # network/DB hiccup: let a later run retry it
            log.exception("ingest %s crashed", video_id)
            _finish(conn, video_id, "blocked", None, f"{type(exc).__name__}: {exc}"[:500])
            return "blocked"
        _finish(conn, video_id, "done", result["segments"], None)
        return "done"


