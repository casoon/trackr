---
title: Event fields
description: The TrackrEvent type, who sets each field, and the matching Postgres column.
order: 2
---

```ts
interface TrackrEvent {
  type: "pageview" | "event";
  name?: string;
  url: string;
  referrer?: string;
  country?: string;
  device?: "desktop" | "mobile" | "tablet";
  browser?: string;
  os?: string;
  sessionId?: string;
  utm?: Record<string, string>;
  props?: Record<string, string | number | boolean>;
  ts: number;
}
```

| Field | Set by | Content | Postgres column |
| --- | --- | --- | --- |
| `type` | client | `pageview` or `event` | `type` |
| `name` | client | event name from `track()` | `name` |
| `url` | client, cleaned by the handler | path and query string | `url` |
| `referrer` | client | referrer hostname (pixel: `ref` parameter) | `referrer_domain` |
| `country` | – | not set by trackr | `country` |
| `device` | handler | from the User-Agent | `device` |
| `browser` | handler | from the User-Agent | `browser` |
| `os` | handler | from the User-Agent | `os` |
| `sessionId` | handler | 16 hex characters, changes daily; only with `anonymizeIp` | `session_id` |
| `utm` | client | UTM parameters without the `utm_` prefix | `utm` (JSONB) |
| `props` | client, sanitized by the handler | properties from `track()` | `props` (JSONB) |
| `ts` | client (pixel: server) | Unix time in milliseconds | `ts` (TIMESTAMPTZ) |

The handler takes `type`, `name`, `url`, `referrer`, `utm`, `props` and `ts` from the request
body and ignores other fields. `device`, `browser`, `os` and `sessionId` are always derived on
the server, never taken from the client. The pixel handler sets no `device`, `browser` or
`os`.

The handler passes `utm` through and the Postgres adapter writes `os` and `utm` since 0.3.0;
see the [changelog](../../../changelog/).
