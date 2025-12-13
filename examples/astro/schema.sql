-- Postgres Schema for trackr
-- Run this to set up your database

CREATE TABLE trackr_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  name TEXT,
  url TEXT NOT NULL,
  referrer_domain TEXT,
  country TEXT,
  device TEXT,
  browser TEXT,
  session_id TEXT,
  props JSONB DEFAULT '{}'
);

-- Indexes for common queries
CREATE INDEX idx_trackr_ts ON trackr_events (ts);
CREATE INDEX idx_trackr_url ON trackr_events (url);
CREATE INDEX idx_trackr_type ON trackr_events (type);
CREATE INDEX idx_trackr_session ON trackr_events (session_id);

-- Example queries

-- Pageviews last 30 days
SELECT DATE(ts) as date, COUNT(*) as views
FROM trackr_events
WHERE type = 'pageview' AND ts > NOW() - INTERVAL '30 days'
GROUP BY DATE(ts)
ORDER BY date;

-- Top pages
SELECT url, COUNT(*) as views
FROM trackr_events
WHERE type = 'pageview' AND ts > NOW() - INTERVAL '30 days'
GROUP BY url
ORDER BY views DESC
LIMIT 10;

-- Unique sessions
SELECT COUNT(DISTINCT session_id) as sessions
FROM trackr_events
WHERE ts > NOW() - INTERVAL '30 days';
