CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE VIEW episodes AS
    SELECT id, youtube_video_id, title, drama_title, channel_title, created_at
      FROM videos;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subtitles_kr_compact_trgm
    ON subtitles USING GIN ((regexp_replace(kr_text, '\s', '', 'g')) gin_trgm_ops);

ANALYZE subtitles;
ANALYZE videos;