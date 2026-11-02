#!/usr/bin/env python3
"""Measure word-level timing of the generated narration -> src/voiceTiming.json.

For every cue in public/voice/manifest.json this script
  1. runs whisper.cpp (`whisper-cli`) on each voice segment (parts/<cue>_NN_<lang>.mp3),
  2. clamps the speech window of each segment with ffmpeg `silencedetect`,
  3. maps the words of the on-screen subtitle onto those measurements, and
  4. writes the measured cue length and word start/end times (seconds, relative to the
     start of public/voice/<cue>.mp3) for src/timeline.ts.

Needs: whisper-cli (brew install whisper-cpp), a ggml model (default: auto-detected, or
--model / $WHISPER_MODEL), ffmpeg/ffprobe.
Run from "NEW BASIC COURSE 20/":  python3 scripts/sync_timing.py [--only i1 b3b]

Accuracy: boundaries are measured, not guessed, but whisper timestamps for Korean are
coarse (typically within ~0.1 s). Segment starts/ends (and therefore every cue boundary)
are exact to the sample.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_voice import FPS, MARKUP, ROOT, load_cues, split_segments  # noqa: E402

OUT = ROOT / "src" / "voiceTiming.json"
MODEL_CANDIDATES = [
    os.environ.get("WHISPER_MODEL", ""),
    str(Path.home() / ".cache" / "whisper" / "ggml-small.bin"),
    str(Path.home() / ".cache" / "whisper" / "ggml-small-q5_1.bin"),
    str(
        Path.home()
        / "Library/Application Support/Movavi/SharedData/VideoEditor/AI Models/speech_to_text_24.5.zip/ggml-small-q5_1.bin"
    ),
]
WORD_CHAR = re.compile(r"[0-9A-Za-z\u3131-\u318e\uac00-\ud7a3]")


def run(cmd: List[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)


def find_model(explicit: Optional[str]) -> str:
    for cand in [explicit or ""] + MODEL_CANDIDATES:
        if cand and Path(cand).is_file():
            return cand
    sys.exit("No whisper ggml model found. Pass --model /path/to/ggml-small.bin (or set $WHISPER_MODEL).")


def probe_seconds(path: Path) -> float:
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    return float(out.stdout.strip())


def decode_wav(src: Path, dst: Path) -> float:
    """16 kHz mono wav (whisper input). The wav length is the exact decoded length ffmpeg uses when merging."""
    r = run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-ar", "16000", "-ac", "1", str(dst)])
    if r.returncode != 0:
        sys.exit(r.stderr)
    return probe_seconds(dst)


def speech_window(wav: Path, total: float) -> Tuple[float, float]:
    r = run(["ffmpeg", "-i", str(wav), "-af", "silencedetect=noise=-38dB:d=0.03", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", r.stderr)]
    ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", r.stderr)]
    onset = ends[0] if starts and starts[0] <= 0.001 and ends else 0.0
    offset = total
    if starts and (not ends or starts[-1] > (ends[-1] if ends else 0)) and starts[-1] > onset:
        offset = starts[-1]
    return onset, max(offset, onset + 0.05)


def whisper_tokens(model: str, wav: Path, lang: str) -> List[Tuple[str, float, float]]:
    base = wav.with_suffix("")
    r = run(["whisper-cli", "-m", model, "-f", str(wav), "-l", lang, "-ml", "1", "-sow", "-ojf", "-of", str(base), "-np"])
    if r.returncode != 0:
        sys.exit(f"whisper-cli failed: {r.stderr[-400:]}")
    data = json.loads(Path(str(base) + ".json").read_text(encoding="utf-8"))
    tokens = []
    for item in data.get("transcription", []):
        text = item.get("text", "")
        n = len(WORD_CHAR.findall(text))
        if n and not text.strip().startswith("["):
            tokens.append((text, item["offsets"]["from"] / 1000, item["offsets"]["to"] / 1000))
    return tokens


class SegmentClock:
    """Maps character positions of a segment's script text to time (seconds in the segment)."""

    def __init__(self, n_chars: int, tokens: List[Tuple[str, float, float]], window: Tuple[float, float]):
        onset, offset = window
        counts = [len(WORD_CHAR.findall(t)) for t, _, _ in tokens]
        total = sum(counts) or 1
        spans = []  # (x0, x1, t0, t1) in script-char units
        acc = 0
        prev_end = onset
        for (text, s, e), c in zip(tokens, counts):
            s = min(max(s, prev_end), offset)
            e = min(max(e, s), offset)
            spans.append([acc / total * n_chars, (acc + c) / total * n_chars, s, e])
            prev_end = e
            acc += c
        if spans:  # speech starts/ends where the audio does
            spans[0][2] = onset
            spans[-1][3] = offset
        else:
            spans = [[0.0, float(n_chars), onset, offset]]
        self.spans = spans

    def at(self, x: float, side: str) -> float:
        spans = self.spans
        for x0, x1, t0, t1 in spans:
            inside = (x0 <= x < x1) if side == "start" else (x0 < x <= x1)
            if inside:
                return t0 + (t1 - t0) * ((x - x0) / (x1 - x0) if x1 > x0 else 0)
        return spans[0][2] if x <= spans[0][0] else spans[-1][3]


def plain(markup: str) -> str:
    return MARKUP.sub(lambda m: m.group(1), markup)


def cue_words(kr: str, en: Optional[str]) -> List[str]:
    """Same tokenisation as Subtitle.tsx: whitespace-split Korean line, then English line."""
    words = plain(kr).split()
    if en:
        words += plain(en).split()
    return words


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="+", metavar="CUE_ID")
    ap.add_argument("--model")
    ap.add_argument("--gap", type=float, default=0.2, help="silence between segments used by generate_voice.py")
    args = ap.parse_args()

    manifest_path = ROOT / "public" / "voice" / "manifest.json"
    if not manifest_path.exists():
        sys.exit("public/voice/manifest.json not found - run scripts/generate_voice.py first.")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    model = find_model(args.model)
    cues = {c["id"]: c for c in load_cues(False)}
    previous = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"fps": FPS, "cues": {}}
    result: Dict[str, dict] = dict(previous.get("cues", {}))

    ids = args.only or [c for c in cues if c in manifest["cues"]]
    missing = [c for c in cues if c not in manifest["cues"]]
    if missing and not args.only:
        sys.exit(f"manifest.json has no entry for: {', '.join(missing)}")

    with tempfile.TemporaryDirectory() as tmp_name:
        tmp = Path(tmp_name)
        for cue_id in ids:
            cue, entry = cues[cue_id], manifest["cues"][cue_id]
            segs = split_segments(cue["kr"], cue.get("en"))
            if len(segs) != len(entry["segments"]) or any(
                s[1] != m["text"] for s, m in zip(segs, entry["segments"])
            ):
                sys.exit(f"[{cue_id}] script text changed since the voice was generated - rerun generate_voice.py.")

            norm = "".join(WORD_CHAR.findall("".join(t for _, t in segs)))
            word_list = cue_words(cue["kr"], cue.get("en"))
            if "".join(WORD_CHAR.findall("".join(word_list))) != norm:
                sys.exit(f"[{cue_id}] subtitle words and voice text differ.")

            # char index (normalised) -> time in the merged cue file
            char_start: List[float] = []
            char_end: List[float] = []
            offset = 0.0
            seg_report = []
            for i, ((lang, text), meta) in enumerate(zip(segs, entry["segments"])):
                wav = tmp / f"{cue_id}_{i}.wav"
                dur = decode_wav(ROOT / "public" / "voice" / meta["file"], wav)
                window = speech_window(wav, dur)
                tokens = whisper_tokens(model, wav, "ko" if lang == "kr" else "en")
                n = len(WORD_CHAR.findall(text))
                clock = SegmentClock(n, tokens, window)
                for k in range(n):
                    char_start.append(offset + clock.at(k, "start"))
                    char_end.append(offset + clock.at(k + 1, "end"))
                seg_report.append(
                    {"lang": lang, "start": round(offset, 3), "speechStart": round(offset + window[0], 3),
                     "speechEnd": round(offset + window[1], 3)}
                )
                offset += dur + args.gap

            merged = ROOT / "public" / "voice" / entry["file"]
            seconds = max(probe_seconds(merged), offset - args.gap)
            words, pos = [], 0
            for w in word_list:
                n = len(WORD_CHAR.findall(w))
                if n == 0:
                    words.append({"s": words[-1]["e"] if words else 0.0, "e": words[-1]["e"] if words else 0.0})
                    continue
                words.append({"s": round(char_start[pos], 3), "e": round(char_end[pos + n - 1], 3)})
                pos += n
            result[cue_id] = {"seconds": round(seconds, 3), "segments": seg_report, "words": words}
            tail = f"{words[0]['s']:.2f}s..{words[-1]['e']:.2f}s of {seconds:.2f}s"
            print(f"[{cue_id}] {len(words)} words, speech {tail}")

    ordered = {k: result[k] for k in cues if k in result}
    OUT.write_text(json.dumps({"fps": FPS, "cues": ordered}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"\nWrote {OUT.relative_to(ROOT)} ({len(ordered)} cues). Run `npx remotion studio` / render to use it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
