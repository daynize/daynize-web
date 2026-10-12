"""K-ECHO subtitle ingestion.

Usage:
    export DATABASE_URL=postgresql://user:pass@localhost:5432/kecho
    python ingest.py <youtube_video_id> "<drama_title>"
"""

import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from bisect import bisect_right
from decimal import Decimal

import psycopg
from youtube_transcript_api import (
    CouldNotRetrieveTranscript,
    NoTranscriptFound,
    YouTubeTranscriptApi,
)

from translator import active_provider, translate_lines

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
MS = Decimal("0.001")
SOUND_TAG_RE = re.compile(r"\[[^\]]{1,12}\]|\([^)]{1,12}\)|[♪♬♫]+")
SPACE_BEFORE_PUNCT_RE = re.compile(r"\s+([.,!?…~])")
NO_SPACE_AFTER_PUNCT_RE = re.compile(r"([.,!?…])(?=[가-힣])")
HANGUL_RE = re.compile(r"[가-힣]")
LATIN_RE = re.compile(r"[A-Za-z]")
# A "ko" track is trusted only if at least this share of its lines contain Hangul.
MIN_KO_TRACK_HANGUL_RATIO = 0.5


def clean(text: str) -> str:
    return " ".join(text.split())


def tidy_korean(text: str) -> str:
    """Light, rule-based cleanup of (often auto-generated) Korean captions; no word-level re-spacing."""
    text = SOUND_TAG_RE.sub(" ", text)  # [음악], (웃음), ♪ are not speakable lines
    text = clean(text)
    text = SPACE_BEFORE_PUNCT_RE.sub(r"\1", text)
    text = NO_SPACE_AFTER_PUNCT_RE.sub(r"\1 ", text)
    return text.strip(" ,")


def is_korean_line(text: str) -> bool:
    """Keep lines that are mainly Korean: '신원미상의 DNA' stays; 'nice', '222', '아 wool' go."""
    hangul = len(HANGUL_RE.findall(text))
    return hangul > 0 and hangul * 2 >= len(LATIN_RE.findall(text))


def hangul_line_ratio(snippets) -> float:
    lines = [s.text for s in snippets if s.text.strip()]
    return sum(1 for t in lines if HANGUL_RE.search(t)) / len(lines) if lines else 0.0


def to_sec(value: float) -> Decimal:
    return Decimal(str(value)).quantize(MS)


def fetch_metadata(video_id: str) -> tuple[str | None, str | None]:
    url = "https://www.youtube.com/oembed?" + urllib.parse.urlencode(
        {"url": f"https://www.youtube.com/watch?v={video_id}", "format": "json"}
    )
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.load(resp)
        return data.get("title"), data.get("author_name")
    except Exception as exc:  # metadata is optional; never block ingestion on it
        print(f"[warn] oEmbed metadata unavailable: {exc}", file=sys.stderr)
        return None, None


def align_english(ko_segments: list[dict], en_snippets) -> None:
    """Attach each English snippet to the Korean segment containing its midpoint."""
    starts = [float(seg["start_time"]) for seg in ko_segments]
    buckets: list[list[str]] = [[] for _ in ko_segments]
    for snip in en_snippets:
        text = clean(snip.text)
        if not text:
            continue
        idx = bisect_right(starts, snip.start + snip.duration / 2) - 1
        if idx >= 0:
            buckets[idx].append(text)
    for seg, parts in zip(ko_segments, buckets):
        seg["en_text"] = " ".join(parts) or None


def fetch_segments(video_id: str) -> list[dict]:
    transcripts = YouTubeTranscriptApi().list(video_id)

    # Manual tracks come first. Some channels upload English captions labelled "ko";
    # skip those for kr_text but keep them as an English source.
    ko, ko_snippets, misfiled_en = None, None, None
    for track in (t for t in transcripts if t.language_code == "ko"):
        snippets = track.fetch()
        ratio = hangul_line_ratio(snippets)
        if ratio >= MIN_KO_TRACK_HANGUL_RATIO:
            ko, ko_snippets = track, snippets
            break
        kind = "auto" if track.is_generated else "manual"
        print(f"[warn] {kind} 'ko' track is not Korean (Hangul lines {ratio:.0%}); skipping it", file=sys.stderr)
        if misfiled_en is None and not track.is_generated:
            misfiled_en = snippets
    if ko is None:
        raise NoTranscriptFound(video_id, ["ko"], transcripts)

    segments = []
    dropped = 0
    for snip in ko_snippets:
        text = tidy_korean(snip.text)
        if not text:
            continue
        if not is_korean_line(text):
            dropped += 1
            continue
        start, duration = to_sec(snip.start), to_sec(snip.duration)
        segments.append(
            {
                "start_time": start,
                "duration": duration,
                "end_time": start + duration,
                "kr_text": text,
                "en_text": None,
            }
        )
    if dropped:
        print(f"[info] dropped {dropped} non-Korean lines")

    en_snippets = None
    try:
        en_snippets = transcripts.find_manually_created_transcript(["en"]).fetch()
        print("[info] using manual English track")
    except NoTranscriptFound:
        if misfiled_en is not None:
            en_snippets = misfiled_en
            print("[info] using English captions found in the mislabelled 'ko' track")
        elif ko.is_translatable:
            try:
                en_snippets = ko.translate("en").fetch()
                print("[info] using YouTube machine translation for English")
            except CouldNotRetrieveTranscript as exc:
                print(f"[warn] English translation failed: {exc}", file=sys.stderr)

    if en_snippets is not None:
        align_english(segments, en_snippets)
    else:
        print("[warn] no English subtitles on YouTube", file=sys.stderr)

    return segments


def save(dsn: str, video_id: str, drama_title: str, title: str, channel: str | None, segments: list[dict]) -> int:
    with psycopg.connect(dsn) as conn, conn.transaction():
        db_video_id = conn.execute(
            """
            INSERT INTO videos (youtube_video_id, title, drama_title, channel_title)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (youtube_video_id) DO UPDATE
               SET title = EXCLUDED.title,
                   drama_title = EXCLUDED.drama_title,
                   channel_title = EXCLUDED.channel_title
            RETURNING id
            """,
            (video_id, title, drama_title, channel),
        ).fetchone()[0]

        # Re-ingestion replaces the previous segment set atomically.
        conn.execute("DELETE FROM subtitles WHERE video_id = %s", (db_video_id,))
        with conn.cursor() as cur:
            cur.executemany(
                """
                INSERT INTO subtitles (video_id, start_time, duration, end_time, kr_text, en_text)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                [
                    (db_video_id, s["start_time"], s["duration"], s["end_time"], s["kr_text"], s["en_text"])
                    for s in segments
                ],
            )
    return db_video_id


class IngestError(Exception):
    """Expected, per-video failure (bad ID, no Korean track, empty track)."""


def fill_missing_english(segments: list[dict]) -> None:
    missing = [s for s in segments if not s["en_text"]]
    if not missing:
        return
    provider = active_provider()
    if provider is None:
        print("[info] no translator (no API key, local model not installed, or KECHO_TRANSLATOR=none); skipping", file=sys.stderr)
        return
    translated = translate_lines([s["kr_text"] for s in missing], log=lambda m: print(m, file=sys.stderr))
    for seg, en in zip(missing, translated or []):
        seg["en_text"] = en
    done = sum(1 for s in missing if s["en_text"])
    print(f"[info] translated {done}/{len(missing)} lines via {provider}")


def ingest_video(dsn: str, video_id: str, drama_title: str) -> dict:
    if not VIDEO_ID_RE.match(video_id):
        raise IngestError(f"invalid YouTube ID: {video_id!r}")
    try:
        segments = fetch_segments(video_id)
    except CouldNotRetrieveTranscript as exc:
        reason = str(exc).split("most likely caused by:")[-1].split("If you are sure")[0].strip()
        raise IngestError(f"Korean subtitles unavailable ({type(exc).__name__}): {reason}") from exc
    if not segments:
        raise IngestError("Korean subtitle track is empty")

    fill_missing_english(segments)
    title, channel = fetch_metadata(video_id)
    title = title or drama_title
    db_id = save(dsn, video_id, drama_title, title, channel, segments)
    return {"db_id": db_id, "title": title, "segments": len(segments)}


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest Korean/English YouTube subtitles into K-ECHO DB")
    parser.add_argument("youtube_video_id")
    parser.add_argument("drama_title")
    args = parser.parse_args()

    if not VIDEO_ID_RE.match(args.youtube_video_id):
        parser.error("youtube_video_id must be an 11-character YouTube ID")

    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        parser.error("DATABASE_URL environment variable is required")

    try:
        result = ingest_video(dsn, args.youtube_video_id, args.drama_title)
    except IngestError as exc:
        print(f"[error] {exc}", file=sys.stderr)
        return 1

    print(f"[done] video_id={result['db_id']} segments={result['segments']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
