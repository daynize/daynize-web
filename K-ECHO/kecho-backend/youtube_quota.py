"""Shared, conservative YouTube Data API quota reservations for batch jobs."""

import os
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

import psycopg


class YouTubeQuotaExceeded(RuntimeError):
    pass


def quota_reset_seconds() -> int:
    now = datetime.now(ZoneInfo("America/Los_Angeles"))
    reset = datetime.combine(now.date() + timedelta(days=1), time.min, now.tzinfo)
    return max(1, int(reset.timestamp() - now.timestamp()))


def reserve_quota(dsn: str, units: int, budget: int) -> None:
    if budget < 0 or units <= 0:
        raise ValueError("Quota budget must be nonnegative and units must be positive")
    with psycopg.connect(dsn) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS youtube_quota_usage (
                quota_day DATE NOT NULL,
                bucket TEXT NOT NULL,
                used_units INT NOT NULL CHECK (used_units >= 0),
                PRIMARY KEY (quota_day, bucket)
            )
        """)
        row = conn.execute("""
            INSERT INTO youtube_quota_usage (quota_day, bucket, used_units)
            SELECT (now() AT TIME ZONE 'America/Los_Angeles')::date, %s, %s
             WHERE %s <= %s
            ON CONFLICT (quota_day, bucket) DO UPDATE
               SET used_units = youtube_quota_usage.used_units + EXCLUDED.used_units
             WHERE youtube_quota_usage.used_units + EXCLUDED.used_units <= %s
            RETURNING used_units
        """, (os.environ.get("KECHO_YOUTUBE_QUOTA_BUCKET", "default"), units, units, budget, budget)).fetchone()
    if row is None:
        raise YouTubeQuotaExceeded("Configured daily YouTube quota budget exhausted")