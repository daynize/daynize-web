# K-ECHO Production Architecture

## Request Boundary

Browser -> GET /api/search -> PostgreSQL subtitles + episodes -> JSON

Browser -> YouTube Iframe Player API -> YouTube video delivery

Independent batch -> approved subtitle exports -> PostgreSQL

The search service does not import the ingestion pipeline, launch a worker,
discover videos, fetch subtitles, translate text, or proxy video bytes. A miss
returns an empty result immediately after DB lookup. The former ingest/discover
HTTP routes have been removed. `/api/kecho/search` remains a compatibility alias.
The result contains `video_id`, fractional `start_time`/`end_time`, dialogue and
drama metadata; `youtube_video_id` remains as a compatibility field.

The browser alone loads `https://www.youtube.com/iframe_api` and controls the
player with `video_id`, `Math.floor(start_time)` and `Math.floor(end_time)`.
Zero-length integer intervals are extended to one second. Repeat and pause
checks use the same bounds. A new search pauses the previous scene.

## Database Migration

Existing `videos` data and subtitle foreign keys remain unchanged. `episodes`
is a simple PostgreSQL view over `videos`; the planner can use the underlying
table indexes. This avoids renaming a populated table and breaking ingestion.

For an existing DB, run from `kecho-backend` before deploying the new API:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrate_search.sql
```

Load `DATABASE_URL` in the shell first; `psql` does not automatically load `.env`.
Do not wrap this migration in a transaction: it creates an index CONCURRENTLY.
For a fresh database, use `db/schema.sql` instead. Existing Korean/English GIN
indexes are retained, and the compact Korean expression now has its own GIN
index. Very short expressions (one or two characters) can still require scans;
benchmark real workloads before setting a latency target.

The API uses a reusable connection pool (default maximum 10), a five-second
pool checkout timeout, read-only transactions and a three-second statement
timeout. Query templates are cached, not search results, so committed batch
updates are visible on the next request without cache invalidation.

Use a dedicated API database role with SELECT on `subtitles`, `episodes` and
`videos`, without write or DDL grants. Grant writes only to the batch role.
Session-level read-only settings are defense in depth, not a substitute for
database privileges. `KECHO_DB_POOL_SIZE` configures each API process's maximum
connections; multiply by the number of Uvicorn workers when sizing PostgreSQL.
Set `KECHO_CORS_ORIGINS` to the exact deployed frontend origins. Restrict the
API process's egress to PostgreSQL at the infrastructure boundary; only the
optional worker needs YouTube/translation egress. Do not configure a site-wide
`Referrer-Policy: no-referrer`, which can cause YouTube player error 153.

## Separate Runtime Dependencies

The read-only search API is deployed as the separate Fly app
`daynize-kecho-api` in `nrt`; it must not replace the Node Gemini relay app.
Set `DATABASE_URL` as a Fly secret using a provisioned production PostgreSQL
database and run `db/migrate_search.sql` against that database before deploying
the API. The `/healthz` endpoint checks database connectivity and is also the
Fly machine health check. The frontend uses
`https://daynize-kecho-api.fly.dev` as its production API origin.

```sh
pip install -r requirements-api.txt
uvicorn api:app --host 127.0.0.1 --port 8000
```

The API needs `DATABASE_URL`, not a YouTube or translation API key. The worker
uses `requirements.txt`; tests use `requirements-dev.txt`. In production use
separate virtual environments/containers, OS users and environment files for
the API and worker. Existing `.env` support is retained for local development.

## Approved Subtitle Sources

The default batch mode imports operator-approved local exports only. It does
not scrape YouTube, check oEmbed, request translation or spend API quota.
`approved_sources.json` starts empty so unapproved content is not imported.
Populate it with licensed provider exports or rights-holder-provided captions:

```json
[
  {
    "youtube_video_id": "abcdefghijk",
    "drama_title": "Example Drama",
    "title": "Example Clip",
    "channel_title": "Rights Holder",
    "rights_reference": "contract-or-approval-reference",
    "embeddable": true,
    "segments": [
      {"start_time": 10.9, "end_time": 12.9, "kr_text": "Example", "en_text": "Example"}
    ]
  }
]
```

`rights_reference` and `embeddable` record operator assertions, not an automated
license verification. Official channel status alone is not a commercial
subtitle license. Keep the source manifests and underlying approvals in your
audit archive. Review existing scraped DB content for licensing separately.
Validate embedding permission during source approval and periodically offline;
runtime embedding restrictions are surfaced as player errors, not server retries.
All timestamps must be finite and `0 <= start < end`. English text is optional
and is not automatically translated in approved mode. Existing videos with
subtitles are skipped by the queue; approved imports are for new videos, not
an automatic correction/replacement workflow.

```sh
python auto_ingest.py --source-mode approved --max-ingest 25 --delay 0
python auto_ingest.py --source-mode approved --loop-hours 6
```

Run the one-shot command from cron/launchd on macOS or deploy the example
`deploy/kecho-ingest.service` and `.timer` on Linux. The examples assume a
provisioned `kecho` user, `/srv/kecho`, and `/etc/kecho/worker.env`; adjust them
before installation. A PostgreSQL advisory lock prevents overlapping scheduler
runs. Jobs are claimed atomically; existing retry/backoff behavior is retained.
Do not launch the batch as part of the API's lifespan or frontend requests.

## Optional Legacy Collection And Quotas

Legacy scraping is retained for explicit, non-default migration/testing use:

```sh
python auto_ingest.py --source-mode legacy --youtube-daily-budget 1000 --max-ingest 5
```

This mode uses YouTube Data API discovery and the previous transcript collector;
it is not an official licensed captions connector. It must not be enabled for
commercial use without an approved source/license policy. A future authorized
captions/provider connector should enter through the approved export contract,
not through public search routes.

Data API calls reserve budget atomically in `youtube_quota_usage`: search costs
100 units and video detail requests one unit. The budget defaults to 1,000 units
per day and resets at midnight Pacific time, matching YouTube. Set
`KECHO_YOUTUBE_QUOTA_BUCKET` consistently across workers sharing one Google
project; the accounting only covers callers using this DB-backed helper, so
leave headroom for other applications. Failed requests remain charged
conservatively. HTTP 403 quota exhaustion and the local budget limit pause
discovery until the next reset; HTTP 429 uses the persistent backoff circuit
breaker. `--max-ingest`, `--per-drama`, and `--delay` additionally bound each run.
These units do not measure transcript scraping or translation usage.

## Validation

```sh
cd kecho-backend
python -m unittest discover -s tests -v
cd ../kecho-frontend
npm run typecheck
npm run build
```

API tests disable external HTTP, check empty results, pagination input bounds,
compatibility routing and import without ingestion packages. Worker tests cover
offline imports, source validation, queue filtering, overlapping runs and quota
reservation. Verify real embedding in the deployed browser as YouTube policies,
ad blockers and autoplay restrictions cannot be established by a mock player.