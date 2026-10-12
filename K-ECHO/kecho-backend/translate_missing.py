"""Fill missing English subtitles (en_text IS NULL) for rows already in the DB.

Usage:
    python translate_missing.py [--video-id 2_QOW4ovIbI] [--limit 10]
"""

import argparse
import os
import sys

import psycopg

from translator import active_provider, translate_lines


def main() -> int:
    parser = argparse.ArgumentParser(description="Translate subtitles whose en_text is NULL")
    parser.add_argument("--video-id", help="restrict to one youtube_video_id")
    parser.add_argument("--limit", type=int, help="max rows to translate (in timeline order)")
    args = parser.parse_args()

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        parser.error("DATABASE_URL is required (env or .env)")

    provider = active_provider()
    if provider is None:
        print("[skip] no translator (no API key, local model not installed, or KECHO_TRANSLATOR=none)", file=sys.stderr)
        return 2

    with psycopg.connect(dsn) as conn:
        rows = conn.execute(
            """
            SELECT s.id, s.kr_text
              FROM subtitles s
              JOIN videos v ON v.id = s.video_id
             WHERE s.en_text IS NULL
               AND (%(vid)s::text IS NULL OR v.youtube_video_id = %(vid)s)
             ORDER BY v.id, s.start_time, s.id
             LIMIT %(limit)s
            """,
            {"vid": args.video_id, "limit": args.limit},
        ).fetchall()

        if not rows:
            print("[done] no rows with empty en_text")
            return 0

        print(f"[info] translating {len(rows)} lines via {provider}")
        translated = translate_lines([kr for _, kr in rows], log=lambda m: print(m, file=sys.stderr))
        updates = [(en, sid) for (sid, _), en in zip(rows, translated or []) if en]

        with conn.transaction(), conn.cursor() as cur:
            cur.executemany("UPDATE subtitles SET en_text = %s WHERE id = %s AND en_text IS NULL", updates)

    print(f"[done] updated {len(updates)}/{len(rows)} rows")
    return 0 if updates else 1


if __name__ == "__main__":
    sys.exit(main())
