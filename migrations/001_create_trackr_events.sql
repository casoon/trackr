-- Migration 001: Create trackr_events table
-- Run this once before starting the trackr server.

CREATE TABLE IF NOT EXISTS trackr_events (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type        TEXT        NOT NULL CHECK (type IN ('pageview', 'event')),
  name        TEXT,
  url         TEXT        NOT NULL,
  referrer_domain TEXT,
  country     TEXT,
  device      TEXT        CHECK (device IN ('desktop', 'mobile', 'tablet')),
  browser     TEXT,
  os          TEXT,
  session_id  TEXT,
  utm         JSONB       DEFAULT NULL,
  props       JSONB       DEFAULT '{}'
);

-- Indexes for common analytics queries
CREATE INDEX IF NOT EXISTS idx_trackr_events_ts     ON trackr_events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_trackr_events_type   ON trackr_events (type);
CREATE INDEX IF NOT EXISTS idx_trackr_events_url    ON trackr_events (url);
CREATE INDEX IF NOT EXISTS idx_trackr_events_utm    ON trackr_events USING gin (utm)   WHERE utm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trackr_events_props  ON trackr_events USING gin (props) WHERE props != '{}';
