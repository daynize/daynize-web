"""Batched Korean -> English subtitle translation via OpenAI, DeepL, or a local offline model.

Provider is picked from the environment (or .env next to this file), in this order:
    OPENAI_API_KEY  -> OpenAI chat completions (KECHO_OPENAI_MODEL, default gpt-4o-mini)
    DEEPL_API_KEY   -> DeepL v2 (keys ending in ":fx" use the free endpoint)
    (no key)        -> local MarianMT model (KECHO_LOCAL_MODEL, default Helsinki-NLP/opus-mt-ko-en);
                       needs `pip install -r requirements-local-mt.txt`
KECHO_TRANSLATOR=openai|deepl|local|none forces a provider (none disables translation).
"""

import importlib.util
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Callable

from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

BATCH_SIZE = 15
MAX_HTTP_RETRIES = 3
CONTEXT_LINES = 3
BATCH_PAUSE_SEC = 0.3
LOCAL_MODEL = os.environ.get("KECHO_LOCAL_MODEL", "Helsinki-NLP/opus-mt-ko-en")
_local_cache: tuple | None = None

SYSTEM_PROMPT = (
    "You translate Korean TV drama subtitle lines into natural, colloquial English for language learners. "
    "The lines are consecutive dialogue, so use the surrounding lines as context. "
    "Translate every line separately: keep the same order and count, never merge or split lines, "
    "and romanize Korean names. "
    "previous_lines_for_context_only are earlier lines given for context; do not translate or return them. "
    'Respond with JSON only: {"translations": ["...", ...]} containing exactly the requested number of strings.'
)


class TranslationError(Exception):
    pass


class FatalTranslationError(TranslationError):
    """Auth or quota failure: retrying later batches would fail the same way."""


FATAL_HTTP = {401: "invalid API key", 403: "forbidden / wrong endpoint for key", 456: "DeepL quota exceeded"}


def _post_json(url: str, payload: dict, headers: dict) -> dict:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req_headers = {"Content-Type": "application/json", **headers}
    for attempt in range(MAX_HTTP_RETRIES):
        req = urllib.request.Request(url, data=body, headers=req_headers, method="POST")
        delay = 2**attempt
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as exc:
            if exc.code in FATAL_HTTP:
                raise FatalTranslationError(f"HTTP {exc.code}: {FATAL_HTTP[exc.code]}") from exc
            retryable = exc.code == 429 or exc.code >= 500
            if not retryable or attempt == MAX_HTTP_RETRIES - 1:
                detail = exc.read().decode("utf-8", "replace")[:300]
                raise TranslationError(f"HTTP {exc.code}: {detail}") from exc
            retry_after = exc.headers.get("Retry-After", "")
            if retry_after.isdigit():
                delay = min(int(retry_after), 30)
        except (urllib.error.URLError, TimeoutError) as exc:
            if attempt == MAX_HTTP_RETRIES - 1:
                raise TranslationError(f"network error: {exc}") from exc
        time.sleep(delay)
    raise TranslationError("unreachable")


def _openai_batch(lines: list[str], api_key: str, context: list[str]) -> list[str | None]:
    model = os.environ.get("KECHO_OPENAI_MODEL", "gpt-4o-mini")
    user_payload = {"previous_lines_for_context_only": context, "count": len(lines), "lines": lines}
    data = _post_json(
        "https://api.openai.com/v1/chat/completions",
        {
            "model": model,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
            ],
        },
        {"Authorization": f"Bearer {api_key}"},
    )
    try:
        out = json.loads(data["choices"][0]["message"]["content"])["translations"]
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise TranslationError(f"unexpected OpenAI response: {exc}") from exc
    if not isinstance(out, list) or len(out) != len(lines) or not all(isinstance(t, str) for t in out):
        raise TranslationError(f"expected {len(lines)} translations, got {len(out) if isinstance(out, list) else out!r}")
    return [t.strip() or None for t in out]


def _deepl_batch(lines: list[str], api_key: str, context: list[str]) -> list[str | None]:
    host = "api-free.deepl.com" if api_key.endswith(":fx") else "api.deepl.com"
    payload = {
        "text": lines,
        "source_lang": "KO",
        "target_lang": "EN-US",
        # Keep each subtitle line as one unit so output stays 1:1 with input.
        "split_sentences": "nonewlines",
        "preserve_formatting": True,
    }
    if context:
        payload["context"] = " ".join(context)  # not billed, only steers wording
    data = _post_json(
        f"https://{host}/v2/translate",
        payload,
        {"Authorization": f"DeepL-Auth-Key {api_key}"},
    )
    out = data.get("translations", [])
    if len(out) != len(lines):
        raise TranslationError(f"expected {len(lines)} translations, got {len(out)}")
    return [t["text"].strip() or None for t in out]


def _local_available() -> bool:
    return all(importlib.util.find_spec(m) for m in ("transformers", "torch", "sentencepiece"))


def _local_batch(lines: list[str], _api_key: str, _context: list[str]) -> list[str | None]:
    global _local_cache
    try:
        import torch
        from transformers import MarianMTModel, MarianTokenizer

        if _local_cache is None:
            tokenizer = MarianTokenizer.from_pretrained(LOCAL_MODEL)
            model = MarianMTModel.from_pretrained(LOCAL_MODEL).eval()
            _local_cache = (tokenizer, model)
        tokenizer, model = _local_cache

        with torch.inference_mode():
            enc = tokenizer(lines, return_tensors="pt", padding=True, truncation=True, max_length=256)
            generated = model.generate(**enc, num_beams=4, max_length=256)
        out = tokenizer.batch_decode(generated, skip_special_tokens=True)
    except Exception as exc:  # model download / tokenizer / generation errors
        raise TranslationError(f"local model: {type(exc).__name__}: {exc}") from exc
    return [t.strip() or None for t in out]


def active_provider() -> str | None:
    forced = os.environ.get("KECHO_TRANSLATOR", "").lower()
    openai_key, deepl_key = os.environ.get("OPENAI_API_KEY"), os.environ.get("DEEPL_API_KEY")
    if forced == "none":
        return None
    if forced == "deepl":
        return "deepl" if deepl_key else None
    if forced == "openai":
        return "openai" if openai_key else None
    if forced == "local":
        return "local" if _local_available() else None
    if openai_key:
        return "openai"
    if deepl_key:
        return "deepl"
    if _local_available():
        return "local"
    return None


def translate_lines(
    lines: list[str],
    batch_size: int = BATCH_SIZE,
    log: Callable[[str], None] = print,
) -> list[str | None] | None:
    """Translate in batches. Returns None when no provider is configured; failed batches yield None entries."""
    provider = active_provider()
    if provider is None:
        return None
    if provider == "openai":
        fn, key = _openai_batch, os.environ["OPENAI_API_KEY"]
    elif provider == "deepl":
        fn, key = _deepl_batch, os.environ["DEEPL_API_KEY"]
    else:
        fn, key = _local_batch, ""

    results: list[str | None] = [None] * len(lines)
    for start in range(0, len(lines), batch_size):
        chunk = lines[start : start + batch_size]
        context = lines[max(0, start - CONTEXT_LINES) : start]
        if start and provider != "local":
            time.sleep(BATCH_PAUSE_SEC)
        # One retry covers occasional LLM count mismatches.
        for attempt in range(2):
            try:
                results[start : start + len(chunk)] = fn(chunk, key, context)
                break
            except FatalTranslationError as exc:
                log(f"[error] {provider} stopped at line {start + 1}: {exc}; remaining lines left untranslated")
                return results
            except TranslationError as exc:
                if attempt == 1:
                    log(f"[warn] {provider} batch {start + 1}-{start + len(chunk)} failed: {exc}")
    return results
