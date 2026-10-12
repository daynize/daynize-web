-- K-ECHO Phase 1 schema (PostgreSQL 13+)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS videos (
    id               BIGSERIAL PRIMARY KEY,
    youtube_video_id VARCHAR(11) NOT NULL UNIQUE,
    title            TEXT        NOT NULL,
    drama_title      TEXT        NOT NULL,
    channel_title    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW episodes AS
        SELECT id, youtube_video_id, title, drama_title, channel_title, created_at
            FROM videos;

CREATE TABLE IF NOT EXISTS subtitles (
    id         BIGSERIAL PRIMARY KEY,
    video_id   BIGINT        NOT NULL REFERENCES videos (id) ON DELETE CASCADE,
    start_time NUMERIC(10, 3) NOT NULL CHECK (start_time >= 0),
    duration   NUMERIC(10, 3) NOT NULL CHECK (duration >= 0),
    end_time   NUMERIC(10, 3) NOT NULL CHECK (end_time >= start_time),
    kr_text    TEXT          NOT NULL,
    en_text    TEXT,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subtitles_video_start
    ON subtitles (video_id, start_time);

-- Trigram GIN indexes: tsvector has no Korean parser, so substring (ILIKE) search uses pg_trgm instead.
CREATE INDEX IF NOT EXISTS idx_subtitles_kr_text_trgm
    ON subtitles USING GIN (kr_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_subtitles_en_text_trgm
    ON subtitles USING GIN (en_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_subtitles_kr_compact_trgm
    ON subtitles USING GIN ((regexp_replace(kr_text, '\s', '', 'g')) gin_trgm_ops);

-- Background ingestion queue. 'on_demand' remains for historical rows only.
-- 'blocked' = YouTube rate-limited this IP; such jobs are retried on a later run.
CREATE TABLE IF NOT EXISTS ingest_jobs (
    youtube_video_id VARCHAR(11) PRIMARY KEY,
    drama_title      TEXT        NOT NULL,
    source           TEXT        NOT NULL CHECK (source IN ('manual', 'scheduler', 'on_demand')),
    status           TEXT        NOT NULL DEFAULT 'queued'
                     CHECK (status IN ('queued', 'running', 'done', 'failed', 'blocked')),
    attempts         INT         NOT NULL DEFAULT 0,
    segments         INT,
    last_error       TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingest_jobs_status
    ON ingest_jobs (status, updated_at);

-- Persistent circuit breaker for YouTube discovery API rate limits.
CREATE TABLE IF NOT EXISTS ingest_scheduler_state (
    name TEXT PRIMARY KEY,
    consecutive_blocks INT NOT NULL DEFAULT 0,
    retry_after TIMESTAMPTZ,
    last_error TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS youtube_quota_usage (
    quota_day DATE NOT NULL,
    bucket TEXT NOT NULL,
    used_units INT NOT NULL CHECK (used_units >= 0),
    PRIMARY KEY (quota_day, bucket)
);
