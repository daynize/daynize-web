"""K-ECHO search API.

Run:
    export DATABASE_URL=postgresql://user:pass@localhost:5432/kecho
    uvicorn api:app --reload
"""

import math
import os
import re
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
load_dotenv(Path(__file__).with_name(".env"))

DSN = os.environ["DATABASE_URL"]
pool = ConnectionPool(
    DSN,
    open=False,
    min_size=1,
    max_size=int(os.environ.get("KECHO_DB_POOL_SIZE", "10")),
    timeout=5,
    kwargs={
        "row_factory": dict_row,
        "options": "-c default_transaction_read_only=on -c statement_timeout=3000",
    },
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    pool.open()
    try:
        pool.wait()
        yield
    finally:
        pool.close()


app = FastAPI(title="K-ECHO API", lifespan=lifespan)

cors_origins = [
    origin.strip()
    for origin in os.environ.get(
        "KECHO_CORS_ORIGINS",
        "https://www.daynize.co.kr,https://daynize.co.kr,"
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
]
app.add_middleware(CORSMiddleware, allow_origins=cors_origins, allow_methods=["GET"], allow_headers=["*"])


@app.get("/healthz", include_in_schema=False)
def healthz():
    try:
        with pool.connection() as conn:
            conn.execute("SELECT 1")
    except Exception as exc:
        raise HTTPException(status_code=503, detail="database unavailable") from exc
    return {"status": "ok"}

MAX_TOKENS = 8
MAX_RELAX_DROP = 2

# Korean subtitle spacing is inconsistent, so kr_text is also compared with all whitespace removed.
KR_COMPACT = r"regexp_replace(s.kr_text, '\s', '', 'g')"

PHRASE_CLAUSE = (
    r"(s.kr_text ILIKE %(p)s ESCAPE '\' OR s.en_text ILIKE %(p)s ESCAPE '\'"
    rf" OR {KR_COMPACT} ILIKE %(p_compact)s ESCAPE '\')"
)

# 0: whole phrase (Korean ignoring spaces, whole English words), 1: phrase as substring, 2: every token in one language.
RANK_EXPR = rf"""CASE
    WHEN {KR_COMPACT} ILIKE %(p_compact)s ESCAPE '\' OR s.en_text ~* %(word_re)s THEN 0
    WHEN s.en_text ILIKE %(p)s ESCAPE '\' THEN 1
    ELSE 2
END"""


@lru_cache(maxsize=32)
def build_queries(token_count: int, match_all: bool = False) -> tuple[str, str]:
    """Match the whole phrase in kr_text/en_text, or all split tokens within the same column."""
    match = "TRUE" if match_all else PHRASE_CLAUSE
    if token_count > 1 and not match_all:
        kr_all = " AND ".join(rf"s.kr_text ILIKE %(t{i})s ESCAPE '\'" for i in range(token_count))
        en_all = " AND ".join(rf"s.en_text ILIKE %(t{i})s ESCAPE '\'" for i in range(token_count))
        match = f"({match} OR ({kr_all}) OR ({en_all}))"
    match = f"{match} AND (%(video)s::text IS NULL OR v.youtube_video_id = %(video)s)"
    order = "v.id, s.start_time, s.id" if match_all else f"{RANK_EXPR}, v.id, s.start_time, s.id"

    count_sql = f"SELECT count(*) AS total FROM subtitles s JOIN episodes v ON v.id = s.video_id WHERE {match}"
    search_sql = f"""
SELECT s.id               AS subtitle_id,
    v.youtube_video_id AS video_id,
       v.youtube_video_id,
       s.start_time::float8 AS start_time,
       s.end_time::float8   AS end_time,
       s.kr_text,
       s.en_text,
       v.drama_title
  FROM subtitles s
    JOIN episodes v ON v.id = s.video_id
 WHERE {match}
 ORDER BY {order}
 LIMIT %(limit)s OFFSET %(offset)s
"""
    return count_sql, search_sql


def escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def escape_regex(value: str) -> str:
    return re.sub(r"([\\.^$|?*+()\[\]{}])", r"\\\1", value)


EDGE_HASH_OR_SPACE = re.compile(r"^[#\s]+|[#\s]+$")
HANGUL = re.compile(r"[가-힣]")


def strip_final_consonant(syllable: str) -> str:
    """'갔' -> '가': drops the 받침 so tense/ending variants share a stem."""
    code = ord(syllable) - 0xAC00
    if not 0 <= code < 11172 or code % 28 == 0:
        return syllable
    return chr(ord(syllable) - code % 28)


def relaxed_keywords(compact: str) -> list[str]:
    """Looser Korean stems, e.g. '어디갔어' -> ['어디갔', '어디가', ...], dropping at most MAX_RELAX_DROP syllables."""
    candidates: list[str] = []
    for drop in range(1, MAX_RELAX_DROP + 1):
        stem = compact[:-drop]
        if len(stem) < 2:
            break
        candidates.append(stem)
        loose = stem[:-1] + strip_final_consonant(stem[-1])
        if loose != stem:
            candidates.append(loose)
    return list(dict.fromkeys(candidates))


def query_params(keyword: str) -> tuple[dict, int]:
    tokens = list(dict.fromkeys(keyword.split()))[:MAX_TOKENS]
    params = {
        "p": f"%{escape_like(keyword)}%",
        "p_compact": f"%{escape_like(''.join(keyword.split()))}%",
        "word_re": rf"\m{escape_regex(keyword)}\M",
        **{f"t{i}": f"%{escape_like(token)}%" for i, token in enumerate(tokens)},
    }
    return params, len(tokens)


@app.get("/api/search")
@app.get("/api/kecho/search", include_in_schema=False)
def search(
    q: str = Query("", max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    video: str | None = Query(None, pattern=r"^[A-Za-z0-9_-]{11}$", description="restrict to one YouTube video"),
):
    # Hashtag-style input ("#사랑해") should match the plain keyword.
    keyword = EDGE_HASH_OR_SPACE.sub("", q)
    if not keyword and not video:
        return {
            "query": "",
            "total": 0,
            "page": page,
            "limit": limit,
            "total_pages": 0,
            "results": [],
            "message": "검색어(q)를 입력하면 해당 표현이 나오는 장면을 찾아드립니다.",
        }

    keyword = " ".join(keyword.split())
    offset = (page - 1) * limit

    with pool.connection() as conn:
        params, token_count = query_params(keyword)
        params["video"] = video
        count_sql, search_sql = build_queries(token_count, match_all=not keyword)
        total = conn.execute(count_sql, params).fetchone()["total"]

        # No exact hit for Korean input: retry with shorter stems ('어디갔어' -> '어디가').
        matched = keyword
        if total == 0 and HANGUL.search(keyword):
            for candidate in relaxed_keywords("".join(keyword.split())):
                params, token_count = query_params(candidate)
                params["video"] = video
                count_sql, search_sql = build_queries(token_count)
                total = conn.execute(count_sql, params).fetchone()["total"]
                if total:
                    matched = candidate
                    break

        rows = conn.execute(search_sql, {**params, "limit": limit, "offset": offset}).fetchall() if total else []

    return {
        "query": keyword,
        "matched_query": matched,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total else 0,
        "results": [{"match_index": offset + i + 1, **row} for i, row in enumerate(rows)],
    }


