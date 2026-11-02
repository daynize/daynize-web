#!/usr/bin/env python3
"""Draft timing from text length -> src/voiceTiming.json, so the lesson can be previewed BEFORE the voice exists.

Run:  node scripts/export-cues.mjs && python3 scripts/estimate_timing.py
Then generate the real narration (scripts/generate_voice.py) and replace this draft with
measured timings by running scripts/sync_timing.py (it writes "measured": true).

While "measured" is false, LectureVideo mounts no <Audio> and the timeline uses these estimates.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_voice import FPS, MARKUP, ROOT, load_cues, speak, split_segments  # noqa: E402

KR_SEC_PER_CHAR = 0.165  # calibrated on the measured narration of lesson 1
EN_SEC_PER_WORD = 0.33
SEG_GAP = 0.2  # same silence generate_voice.py puts between segments
WORD_CHAR = re.compile(r"[0-9A-Za-z\u3131-\u318e\uac00-\ud7a3]")


def plain(markup: str) -> str:
    return MARKUP.sub(lambda m: m.group(1), markup)


def main() -> int:
    out = ROOT / "src" / "voiceTiming.json"
    result = {}
    for cue in load_cues(True):
        segs = split_segments(cue["kr"], cue.get("en"), cue.get("say"))
        # time of every normalised character of the cue
        char_times, t = [], 0.0
        for lang, text in segs:
            n = len(WORD_CHAR.findall(text))
            per = KR_SEC_PER_CHAR if lang == "kr" else EN_SEC_PER_WORD * len(text.split()) / max(1, n)
            for k in range(n):
                char_times.append((t + k * per, t + (k + 1) * per))
            t += n * per + SEG_GAP
        seconds = max(t - SEG_GAP, 0.5)

        words, pos = [], 0
        for word in ([speak(w) for w in plain(cue["kr"]).split()] + (plain(cue["en"]).split() if cue.get("en") else [])):
            n = len(WORD_CHAR.findall(word))
            if n == 0:
                prev = words[-1]["e"] if words else 0.0
                words.append({"s": prev, "e": prev})
                continue
            words.append({"s": round(char_times[pos][0], 3), "e": round(char_times[pos + n - 1][1], 3)})
            pos += n
        result[cue["id"]] = {"seconds": round(seconds, 3), "segments": [], "words": words}
        if cue.get("say"):
            result[cue["id"]]["chars"] = [[round(s, 3), round(e, 3)] for s, e in char_times]

    out.write_text(json.dumps({"fps": FPS, "measured": False, "cues": result}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Wrote DRAFT timing for {len(result)} cues -> {out.relative_to(ROOT)} (measured=false)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
