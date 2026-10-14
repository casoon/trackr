---
title: Postgres
description: The trackr_events table, its indexes, retention and example report queries.
order: 3
---

## Migration

`migrations/001_create_trackr_events.sql` creates the table and five indexes. It uses
`IF NOT EXISTS` throughout, so running it twice is harmless.

```sh
psql "$DATABASE_URL" -f migrations/001_create_trackr_events.sql
```

Since 0.3.0 it also ships in the npm package as
`node_modules/@casoon/trackr/migrations/001_create_trackr_events.sql`.

```sql
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
```

The `type` check matters: the handler accepts any string as `type`, but the table only takes
`pageview` and `event`, so other values fail with `500`.

## Indexes

| Index | Column | Purpose |
| --- | --- | --- |
| `idx_trackr_events_ts` | `ts DESC` | Time ranges |
| `idx_trackr_events_type` | `type` | Pageviews vs. custom events |
| `idx_trackr_events_url` | `url` | Per-page reports |
| `idx_trackr_events_utm` | `utm` (GIN, where not null) | Campaign attribution |
| `idx_trackr_events_props` | `props` (GIN, where not empty) | Filtering on event properties |

## Retention

Events contain no IP address, and session IDs change daily. If you still want to limit
how long events are kept, delete old rows on a schedule, for example with `pg_cron`:

```sql
DELETE FROM trackr_events WHERE ts < NOW() - INTERVAL '90 days';
```

## Report queries

```sql
-- Pageviews per day, last 30 days
SELECT DATE_TRUNC('day', ts) AS day, COUNT(*) AS views
FROM trackr_events
WHERE type = 'pageview' AND ts > NOW() - INTERVAL '30 days'
GROUP BY 1 ORDER BY 1;

-- Top pages
SELECT url, COUNT(*) AS views
FROM trackr_events
WHERE type = 'pageview'
GROUP BY url ORDER BY views DESC LIMIT 20;

-- UTM sources
SELECT utm->>'source' AS source, COUNT(*) AS views
FROM trackr_events
WHERE utm IS NOT NULL
GROUP BY 1 ORDER BY 2 DESC;

-- Custom events
SELECT name, COUNT(*) AS fires
FROM trackr_events
WHERE type = 'event'
GROUP BY name ORDER BY fires DESC;

-- Daily visitors (distinct session IDs per day)
SELECT DATE_TRUNC('day', ts) AS day, COUNT(DISTINCT session_id) AS visitors
FROM trackr_events
GROUP BY 1 ORDER BY 1;
```
