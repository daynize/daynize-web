"""Offline import of operator-approved, licensed subtitle exports."""

import json
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path

from ingest import VIDEO_ID_RE, save


@dataclass
class ApprovedVideo:
    video_id: str
    drama_title: str
    title: str
    channel_title: str
    rights_reference: str
    segments: list[dict]

    def ingest(self, dsn: str, video_id: str, drama_title: str) -> dict:
        if video_id != self.video_id or drama_title != self.drama_title:
            raise ValueError("Approved source does not match the queued video/title")
        db_id = save(dsn, video_id, drama_title, self.title, self.channel_title, self.segments)
        return {"db_id": db_id, "title": self.title, "segments": len(self.segments)}


def load_sources(path: Path) -> dict[str, ApprovedVideo]:
    entries = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(entries, list):
        raise ValueError("Approved sources must be a JSON list")
    sources: dict[str, ApprovedVideo] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Each approved source must be an object")
        for field in ("youtube_video_id", "drama_title", "title", "channel_title", "rights_reference"):
            if not isinstance(entry.get(field), str) or not entry[field].strip():
                raise ValueError(f"Approved source requires {field}")
        video_id = entry["youtube_video_id"]
        if not VIDEO_ID_RE.fullmatch(video_id) or video_id in sources:
            raise ValueError("Approved source has an invalid or duplicate video ID")
        if entry.get("embeddable") is not True:
            raise ValueError("Operator must confirm embeddable=true for approved sources")
        raw_segments = entry.get("segments")
        if not isinstance(raw_segments, list) or not raw_segments:
            raise ValueError("Approved source requires nonempty segments")
        segments = []
        for segment in raw_segments:
            if not isinstance(segment, dict):
                raise ValueError("Each subtitle segment must be an object")
            try:
                start = Decimal(str(segment["start_time"]))
                end = Decimal(str(segment["end_time"]))
            except (KeyError, InvalidOperation) as exc:
                raise ValueError("Invalid subtitle timestamps") from exc
            if not start.is_finite() or not end.is_finite() or start < 0 or end <= start:
                raise ValueError("Subtitle timestamps must be finite and 0 <= start < end")
            if not isinstance(segment.get("kr_text"), str) or not segment["kr_text"].strip():
                raise ValueError("Subtitle requires nonempty kr_text")
            english = segment.get("en_text")
            if english is not None and not isinstance(english, str):
                raise ValueError("en_text must be a string or null")
            segments.append({
                "start_time": start,
                "end_time": end,
                "duration": end - start,
                "kr_text": segment["kr_text"].strip(),
                "en_text": english,
            })
        sources[video_id] = ApprovedVideo(
            video_id, entry["drama_title"], entry["title"], entry["channel_title"],
            entry["rights_reference"], sorted(segments, key=lambda segment: segment["start_time"]),
        )
    return sources