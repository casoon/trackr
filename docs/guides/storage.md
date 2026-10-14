---
title: Storage adapters
description: Postgres, external API, webhook, GA4, fan-out and batching, and how to write your own adapter.
order: 2
---

The handler passes every accepted event to `storage.save(event)`. An adapter is any object
with that method:

```ts
interface StorageAdapter {
  save(event: TrackrEvent): Promise<void>;
  saveBatch?(events: TrackrEvent[]): Promise<void>;
  query?(options: QueryOptions): Promise<TrackrEvent[]>;
}
```

## Postgres

```ts
import { postgres } from "@casoon/trackr/storage/postgres";

const storage = postgres(process.env.DATABASE_URL);
```

Pass a connection string (a `pg` pool is created on first use) or any client with a
`query(text, values)` method. `save()` inserts into `trackr_events`; `query({ from, to, type, limit })`
returns events, newest first. Table and indexes: [Postgres](../database/).

## External API

```ts
import { api } from "@casoon/trackr/storage/api";

const storage = api({
  url: "https://analytics.example.com/collect",
  headers: { Authorization: "Bearer …" },
  transform: (event) => ({ name: event.type, url: event.url }),
});
```

POSTs the event (or the result of `transform`) as JSON. The response status is not checked.

## Webhook

```ts
import { webhook } from "@casoon/trackr/storage/webhook";

const storage = webhook({
  url: "https://api.example.com/events",
  secret: process.env.WEBHOOK_SECRET,
  headers: { Authorization: "Bearer …" },
  retry: { attempts: 3, baseDelay: 500 },
});
```

- `secret`: the JSON body is signed with HMAC-SHA256, the hex digest is sent as
  `X-Trackr-Signature`. Verify it on the receiving side over the raw body.
- `retry`: on a `5xx` response the request is repeated up to `attempts` times, waiting
  `baseDelay`, then twice as long, and so on. `4xx` responses fail at once. Without
  `attempts`, no retry happens.
- `transform`: like the API adapter.
- `saveBatch()` sends an array of events in one request; `batch()` uses it.

A non-2xx response that is not retried throws `Webhook failed: <status> <statusText>`.

## GA4 Measurement Protocol

```ts
import { ga4 } from "@casoon/trackr/storage/ga4";

const storage = ga4({
  measurementId: "G-XXXXXXXXXX",
  apiSecret: process.env.GA4_API_SECRET,
  nonPersonalizedAds: true, // default
  stripQueryParams: ["ref", "fbclid*"],
  debug: false, // true: send to the validation endpoint, nothing is recorded
});
```

Pageviews become `page_view` with `page_location` and `page_referrer`. In custom event names,
characters other than letters, digits and underscores become `_`, leading non-letters are
dropped, the name is cut to 40 characters, and reserved GA4 names get the prefix `trackr_`. Property keys are cut to 40
characters, string values to 100. The session ID is sent as `client_id` and `session_id`;
events without one get `anon_<ts>`. A non-2xx response throws.

## Multi

```ts
import { multi } from "@casoon/trackr/storage/multi";

const storage = multi(postgres(process.env.DATABASE_URL), webhook({ url: "…" }));
```

Calls `save()` on every adapter at the same time. If one fails, the handler answers `500`.

## Batch

```ts
import { batch } from "@casoon/trackr/storage/batch";

const storage = batch(webhook({ url: "…" }), {
  maxSize: 20, // default 10
  maxWait: 10_000, // ms, default 5000
  onError: (error, events) => console.error(error, events.length),
});

process.on("SIGTERM", () => storage.flush());
```

Events are kept in memory and written when `maxSize` is reached or `maxWait` milliseconds
after the first buffered event. With `saveBatch()` on the wrapped adapter the batch goes out
in one call, otherwise `save()` is called per event. `storage.pending` is the number of
buffered events. The buffer lives only in memory: events not yet flushed are lost
when the process ends, so call `flush()` on shutdown.

## Your own adapter

```ts
import type { StorageAdapter } from "@casoon/trackr";

const storage: StorageAdapter = {
  async save(event) {
    await db.insert(event);
  },
};
```
