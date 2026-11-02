#!/usr/bin/env python3
"""Generate the narration for "16강 접속사" with ElevenLabs.

Every cue of the video (src/script.ts) is split into a Korean commentary segment and,
for story examples only, an English example segment. Each segment is synthesised with its own voice, then
the segments of a cue are stitched into one file the Remotion composition can
play (public/voice/<cue-id>.mp3).

Setup (once):
    python3 -m venv .venv && source .venv/bin/activate
    pip install -r scripts/requirements.txt
    export ELEVENLABS_API_KEY="sk_..."      # or put it in a git-ignored .env file

Usage (from "NEW BASIC COURSE 20/"):
    python3 scripts/generate_voice.py --dry-run        # list segments + character count, no API calls
    python3 scripts/generate_voice.py                  # generate everything (skips unchanged segments)
    python3 scripts/generate_voice.py --only i1 b3b    # only some cues
    python3 scripts/generate_voice.py --force          # regenerate even if cached

Output:
    public/voice/<cue-id>.mp3            merged narration per cue (used by LectureVideo.tsx)
    public/voice/parts/<cue-id>_NN_<kr|en>.mp3   individual voice segments
    public/voice/manifest.json           measured durations (seconds / frames) for src/sync step

Requires ffmpeg on PATH (merging + silence gaps). Without it, use --no-merge.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent  # "NEW BASIC COURSE 20/"
REPO_ROOT = ROOT.parent
CUES_JSON = ROOT / "scripts" / "cues.json"
TIMELINE_TS = ROOT / "src" / "script.ts"
EXPORTER = ROOT / "scripts" / "export-cues.mjs"

VOICE_IDS = {
    "kr": "0emXFRrt8HxjqJpgeQtr",  # Korean commentary
    "en": "r1KmysJdVYZjJCm4mL3b",  # English example sentences
}
FPS = 30
OUTPUT_FORMAT = "mp3_44100_128"

Segment = Tuple[str, str]  # (lang, text)

# The Korean voice reads "more" as "모레/모래"; respell it for TTS only (on-screen subtitles still show "more").
PRONUNCIATION_KR = {"more": "모어", "many": "메니", "the": "더", "and": "앤드", "but": "벗", "or": "오어"}


# --------------------------------------------------------------------------- env
def load_dotenv() -> None:
    """Minimal .env loader (course folder first, then repo root). Never overrides real env vars."""
    for folder in (ROOT, REPO_ROOT):
        env_file = folder / ".env"
        if not env_file.is_file():
            continue
        for raw in env_file.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip().removeprefix("export ").strip()
            os.environ.setdefault(key, value.strip().strip("'\""))


# ------------------------------------------------------------------------ script
def load_cues(refresh: bool) -> List[dict]:
    """Cues come from src/script.ts via scripts/export-cues.mjs (cached in scripts/cues.json)."""
    stale = (
        refresh
        or not CUES_JSON.exists()
        or (TIMELINE_TS.exists() and TIMELINE_TS.stat().st_mtime > CUES_JSON.stat().st_mtime)
    )
    if stale and shutil.which("node") and EXPORTER.exists():
        result = subprocess.run(["node", str(EXPORTER)], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"[warn] cue export failed, using cached cues.json:\n{result.stderr.strip()}", file=sys.stderr)
    if not CUES_JSON.exists():
        sys.exit("scripts/cues.json is missing and could not be generated (needs node + repo node_modules).")
    return json.loads(CUES_JSON.read_text(encoding="utf-8"))


MARKUP = re.compile(r"\{[vpeycgbml]\|([^}]*)\}")
HANGUL = re.compile(r"[\u3131-\u318e\uac00-\ud7a3]")
LATIN = re.compile(r"[A-Za-z]")


def speak(text: str) -> str:
    """Text actually sent to the Korean voice: markdown symbols are dropped and English words it mispronounces are respelled (subtitles keep the original)."""
    text = re.sub(r"\$?\\rightarrow\$?|->|→|[~*`#]", " ", text)
    for word, spoken in PRONUNCIATION_KR.items():
        text = re.sub(rf"(?<![A-Za-z]){re.escape(word)}(?![A-Za-z])", spoken, text, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", text).strip()


def split_segments(kr_markup: str, en_markup: Optional[str], say: Optional[str] = None) -> List[Segment]:
    """Voice rule of this course (lesson 13+).

    1. Explanations (the `kr` line) are read ONLY by the Korean voice, even when English words appear inside
       ("could는 가능성을 말합니다" is never split to the English voice).
    2. Example sentences (the `en` line of story cues) alternate: Korean line (KR voice) -> English sentence (EN voice).
    3. Only the Korean segment goes through speak(); the English voice reads the sentence unchanged.
    4. `say` (optional) replaces the Korean voice text when the cue must be spoken differently from its subtitle
       (e.g. the chant "스, 머, 프!"); it may only differ from `kr` in spaces and punctuation.
    """
    kr_text = say if say else re.sub(r"\s+", " ", MARKUP.sub(lambda m: m.group(1), kr_markup)).strip()
    segments = [("kr", speak(kr_text))]
    if en_markup:
        segments.append(("en", re.sub(r"\s+", " ", MARKUP.sub(lambda m: m.group(1), en_markup)).strip()))
    return [(lang, text) for lang, text in segments if text]


def split_segments_mixed(kr_markup: str, en_markup: Optional[str]) -> List[Segment]:
    """(Unused in lesson 13) older rule: Korean narration -> [(lang, text)], embedded English phrases go to the EN voice.

    {e|She lied him}이라고 쓰면 ...  ->  [("en", "She lied him"), ("kr", "이라고 쓰면 ...")]
    A trailing English sentence (story lines) is appended as its own EN segment.
    """
    pieces: List[str] = []
    last = 0
    for m in MARKUP.finditer(kr_markup):
        pieces.append(kr_markup[last : m.start()])
        pieces.append(m.group(1))
        last = m.end()
    pieces.append(kr_markup[last:])

    segments: List[List[str]] = []
    pending = ""  # whitespace/punctuation before the first real piece
    for piece in pieces:
        if not piece:
            continue
        if HANGUL.search(piece):
            lang = "kr"
        elif LATIN.search(piece):
            lang = "en"
        else:  # spaces / punctuation only: glue to the previous segment
            if segments:
                segments[-1][1] += piece
            else:
                pending += piece
            continue
        if segments and segments[-1][0] == lang:
            segments[-1][1] += pending + piece
        else:
            segments.append([lang, pending + piece])
        pending = ""

    if en_markup:
        english = MARKUP.sub(lambda m: m.group(1), en_markup)
        segments.append(["en", english])

    return [(lang, re.sub(r"\s+", " ", text).strip()) for lang, text in segments if text.strip()]


# ------------------------------------------------------------------- elevenlabs
def make_client(api_key: str):
    try:
        from elevenlabs.client import ElevenLabs
    except ImportError:
        sys.exit("Missing dependency. Run: pip install -r scripts/requirements.txt")
    return ElevenLabs(api_key=api_key)


def synthesize(client, voice_id: str, text: str, args: argparse.Namespace) -> bytes:
    from elevenlabs import VoiceSettings
    from elevenlabs.core.api_error import ApiError

    settings = VoiceSettings(
        stability=args.stability,
        similarity_boost=args.similarity,
        style=args.style,
        use_speaker_boost=True,
    )
    delay = 2.0
    for attempt in range(1, 5):
        try:
            stream = client.text_to_speech.convert(
                voice_id=voice_id,
                text=text,
                model_id=args.model,
                output_format=OUTPUT_FORMAT,
                voice_settings=settings,
            )
            return b"".join(stream)
        except ApiError as err:
            status = getattr(err, "status_code", None)
            if status in (401, 403):
                sys.exit(f"ElevenLabs rejected the API key / permissions (HTTP {status}): {err.body}")
            if status == 422 or (status is not None and 400 <= status < 500 and status != 429):
                sys.exit(f"ElevenLabs request error (HTTP {status}): {err.body}")
            reason = f"HTTP {status}"
        except Exception as err:  # network hiccups
            reason = repr(err)
        if attempt == 4:
            sys.exit(f"Giving up after {attempt} attempts ({reason}).")
        print(f"    retry {attempt} in {delay:.0f}s ({reason})")
        time.sleep(delay)
        delay *= 2
    raise AssertionError("unreachable")


# ------------------------------------------------------------------------ audio
def find_ffmpeg() -> Optional[str]:
    return shutil.which("ffmpeg")


def mp3_seconds(path: Path) -> float:
    from mutagen.mp3 import MP3

    return float(MP3(str(path)).info.length)


def merge(parts: List[Path], out: Path, gap: float, ffmpeg: str) -> None:
    """Concatenate parts with a short silence between them (re-encoded, so formats always match)."""
    if len(parts) == 1:
        shutil.copyfile(parts[0], out)
        return
    cmd = [ffmpeg, "-y", "-loglevel", "error"]
    labels = []
    index = 0
    for i, part in enumerate(parts):
        cmd += ["-i", str(part)]
        labels.append(f"[{index}:a]aresample=44100,aformat=channel_layouts=mono[a{index}]")
        index += 1
        if i < len(parts) - 1 and gap > 0:
            cmd += ["-f", "lavfi", "-t", f"{gap:.3f}", "-i", "anullsrc=r=44100:cl=mono"]
            labels.append(f"[{index}:a]aformat=channel_layouts=mono[a{index}]")
            index += 1
    joined = "".join(f"[a{i}]" for i in range(index))
    graph = ";".join(labels) + f";{joined}concat=n={index}:v=0:a=1[out]"
    cmd += ["-filter_complex", graph, "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "128k", str(out)]
    subprocess.run(cmd, check=True)


# ------------------------------------------------------------------------- main
def main() -> int:
    parser = argparse.ArgumentParser(description="Generate KR/EN narration mp3 files with ElevenLabs.")
    parser.add_argument("--only", nargs="+", metavar="CUE_ID", help="only these cue ids (e.g. i1 b3b s05)")
    parser.add_argument("--out", type=Path, default=ROOT / "public" / "voice", help="output directory")
    parser.add_argument("--model", default="eleven_multilingual_v2", help="ElevenLabs model id")
    parser.add_argument("--gap", type=float, default=0.2, help="silence (s) between segments of one cue")
    parser.add_argument("--stability", type=float, default=0.5)
    parser.add_argument("--similarity", type=float, default=0.75)
    parser.add_argument("--style", type=float, default=0.0)
    parser.add_argument("--force", action="store_true", help="regenerate segments even if cached")
    parser.add_argument("--no-merge", action="store_true", help="only write the per-segment files")
    parser.add_argument("--dry-run", action="store_true", help="print the plan, make no API calls")
    parser.add_argument("--refresh-cues", action="store_true", help="re-export cues from src/script.ts")
    args = parser.parse_args()

    load_dotenv()
    cues = load_cues(args.refresh_cues)
    if args.only:
        wanted = set(args.only)
        unknown = wanted - {c["id"] for c in cues}
        if unknown:
            sys.exit(f"Unknown cue ids: {', '.join(sorted(unknown))}")
        cues = [c for c in cues if c["id"] in wanted]

    plan = [(c["id"], split_segments(c["kr"], c.get("en"), c.get("say"))) for c in cues]
    total_chars = sum(len(text) for _, segs in plan for _, text in segs)
    total_segments = sum(len(segs) for _, segs in plan)

    if args.dry_run:
        for cue_id, segs in plan:
            print(f"[{cue_id}]")
            for n, (lang, text) in enumerate(segs, 1):
                print(f"  {n:02d} {lang.upper()}  {text}")
        print(f"\n{len(plan)} cues, {total_segments} segments, {total_chars} characters (≈ credits, models differ).")
        return 0

    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        sys.exit("ELEVENLABS_API_KEY is not set. export it or add it to a git-ignored .env file.")
    ffmpeg = find_ffmpeg()
    if not args.no_merge and not ffmpeg:
        sys.exit("ffmpeg not found (brew install ffmpeg), or rerun with --no-merge.")

    client = make_client(api_key)
    parts_dir = args.out / "parts"
    parts_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = args.out / "manifest.json"
    manifest = {"fps": FPS, "model": args.model, "voices": VOICE_IDS, "cues": {}}
    if manifest_path.exists():
        try:
            manifest["cues"] = json.loads(manifest_path.read_text(encoding="utf-8")).get("cues", {})
        except json.JSONDecodeError:
            pass
    cached: Dict[str, str] = {
        seg["file"]: seg["hash"] for cue in manifest["cues"].values() for seg in cue.get("segments", [])
    }

    for cue_id, segs in plan:
        print(f"[{cue_id}] {len(segs)} segment(s)")
        part_paths: List[Path] = []
        seg_info = []
        for n, (lang, text) in enumerate(segs, 1):
            voice_id = VOICE_IDS[lang]
            digest = hashlib.sha1(f"{voice_id}|{args.model}|{args.stability}|{args.similarity}|{args.style}|{text}".encode()).hexdigest()[:16]
            rel = f"parts/{cue_id}_{n:02d}_{lang}.mp3"
            path = args.out / rel
            if path.exists() and cached.get(rel) == digest and not args.force:
                print(f"  {n:02d} {lang.upper()} cached")
            else:
                print(f"  {n:02d} {lang.upper()} {text}")
                path.write_bytes(synthesize(client, voice_id, text, args))
            part_paths.append(path)
            seg_info.append({"lang": lang, "text": text, "file": rel, "hash": digest, "seconds": round(mp3_seconds(path), 3)})

        entry = {"segments": seg_info}
        if not args.no_merge:
            out_file = args.out / f"{cue_id}.mp3"
            merge(part_paths, out_file, args.gap, ffmpeg)  # type: ignore[arg-type]
            seconds = mp3_seconds(out_file)
            entry.update({"file": f"{cue_id}.mp3", "seconds": round(seconds, 3), "frames": round(seconds * FPS)})
            print(f"  -> {out_file.name} ({seconds:.2f}s, {entry['frames']} frames)")
        manifest["cues"][cue_id] = entry
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"\nDone. Files in {args.out}. Next: set VOICE_ENABLED = true in src/LectureVideo.tsx.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
