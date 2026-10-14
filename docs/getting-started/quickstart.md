---
title: Quickstart
description: From the client script to the first stored pageview, using Astro and Postgres as the example.
order: 2
---

## 1. Load the client

Add the client once to the layout every page uses:

```astro
---
// src/components/Analytics.astro
---
<script>
  import { init } from "@casoon/trackr/client";
  init({ endpoint: "/api/track" });
</script>
```

`init()` sends a pageview right away and again on every `pushState`, `replaceState`,
`popstate` and `hashchange`. Pass `debug: true` to log each event to the console.

Custom events:

```ts
import { track } from "@casoon/trackr/client";

track("signup_click", { plan: "pro" });
```

Property values are strings, numbers or booleans. `track()` before `init()` logs a warning and
sends nothing.

## 2. Add the endpoint

The handler takes a web `Request` and returns a `Response`, so it fits any framework with
that signature. In Astro the route has to run on request:

```ts
// src/pages/api/track.ts
import { createHandler } from "@casoon/trackr/server";
import { postgres } from "@casoon/trackr/storage/postgres";

export const prerender = false;

const handler = createHandler({
  storage: postgres(import.meta.env.DATABASE_URL),
  privacy: { anonymizeIp: true, stripPii: true },
  botFilter: true,
});

export const POST = async ({ request }) => handler(request);
```

Responses: `405` for anything but `POST`, `400` when `type`, `url` or `ts` are missing or have
the wrong type, `500` when the body is not JSON or storage fails, otherwise `200 OK`. Requests the bot filter rejects
also get `200 OK`, but nothing is stored.

## 3. Create the table

The repository contains `migrations/001_create_trackr_events.sql`. It creates the
`trackr_events` table and its indexes:

```sh
psql "$DATABASE_URL" -f migrations/001_create_trackr_events.sql
```

Since 0.3.0 the file is part of the npm package
(`node_modules/@casoon/trackr/migrations/`). Details in
[Postgres](../../guides/database/).

## What gets stored

For a pageview with UTM parameters and an email address in the query string, the handler
stores this event (captured by `examples/capture.mjs`, more in the [showcase](../../../showcase/)):

```json
{
  "type": "pageview",
  "url": "/pricing?utm_source=newsletter&utm_medium=email&utm_campaign=october",
  "referrer": "news.ycombinator.com",
  "utm": {
    "source": "newsletter",
    "medium": "email",
    "campaign": "october"
  },
  "ts": 1791961200000,
  "sessionId": "c6c4216a1163582e",
  "device": "desktop",
  "browser": "Safari",
  "os": "macOS"
}
```

The request carried `&email=jane@example.com` and the IP `203.0.113.42`; neither is in the
stored event. Why, and what else is removed: [Privacy](../../guides/privacy/).
