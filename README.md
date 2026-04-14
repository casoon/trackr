# @casoon/trackr

Privacy-first, GDPR-native analytics for static sites. No cookies, no persistent IDs, self-hosted.

## Live Demo

- [Homepage (Pageview)](https://trackr-demo.casoon.dev/)
- [Shop (E-Commerce Events)](https://trackr-demo.casoon.dev/shop)
- [Landing (Lead Forms)](https://trackr-demo.casoon.dev/landing)
- [Stats (Raw Data)](https://trackr-demo.casoon.dev/stats)

**UTM-Parameter Test:**
- [With UTM params](https://trackr-demo.casoon.dev/?utm_source=github&utm_medium=readme&utm_campaign=trackr)

## Features

- **Privacy by Default** - No cookies, no localStorage, no fingerprinting
- **Lightweight** - Client script < 1KB gzipped
- **Self-Hosted** - Your data stays on your infrastructure
- **UTM Tracking** - Automatic extraction of campaign parameters
- **SPA Support** - Auto-tracks `pushState`/`replaceState`/`hashchange` navigation
- **OS Detection** - Server-side detection (Android, iOS, Windows, macOS, Linux, ChromeOS)
- **Bot Filtering** - Common crawlers and headless browsers excluded
- **Flexible Storage** - Postgres, external API, GA4 Measurement Protocol, or fan-out multi-adapter
- **Webhook** - Forward events to any HTTP endpoint with HMAC-SHA256 signing and retry
- **Batching** - Buffer events and flush in batches (size- or time-based) to reduce network calls
- **Pixel Tracking** - Transparent GIF endpoint for email/no-JS contexts
- **Astro-First** - Designed for Astro, works with any static site

## Installation

```bash
npm install @casoon/trackr
```

## Quick Start

### 1. Add the client script

```astro
---
// src/components/Analytics.astro
---
<script>
  import { init } from "@casoon/trackr/client";
  init({ endpoint: "/api/track" });
</script>
```

Or via CDN (no build step):

```html
<script src="https://unpkg.com/@casoon/trackr"></script>
<script>
  trackr.init({ siteId: "your-site-id", endpoint: "https://your-api.com/collect" });
</script>
```

### 2. Create the API endpoint

```typescript
// src/pages/api/track.ts
import { createHandler } from "@casoon/trackr/server";
import { postgres } from "@casoon/trackr/storage/postgres";

const handler = createHandler({
  storage: postgres(import.meta.env.DATABASE_URL),
  privacy: { anonymizeIp: true, stripPii: true },
  botFilter: true
});

export const POST = async ({ request }) => handler(request);
```

### 3. Set up the database

```sql
CREATE TABLE trackr_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL,
  name TEXT,
  url TEXT NOT NULL,
  referrer_domain TEXT,
  props JSONB DEFAULT '{}'
);
```

## Custom Events

```typescript
import { track } from "@casoon/trackr/client";

track("signup_click", { plan: "pro" });
```

## Storage Adapters

### Postgres (recommended for GDPR compliance)

```typescript
import { postgres } from "@casoon/trackr/storage/postgres";
const storage = postgres(process.env.DATABASE_URL);
```

### External API

```typescript
import { api } from "@casoon/trackr/storage/api";
const storage = api({
  url: "https://plausible.io/api/event",
  transform: (event) => ({ ... })
});
```

### GA4 Measurement Protocol (optional, privacy proxy)

Forwards events server-side — the GA script never loads in the user's browser.

```typescript
import { ga4 } from "@casoon/trackr/storage/ga4";
const storage = ga4({
  measurementId: "G-XXXXXXXXXX",
  apiSecret: process.env.GA4_API_SECRET,
  nonPersonalizedAds: true,   // default true
  stripQueryParams: true,      // strip query strings from URLs
  debug: false
});
```

> **GDPR note:** GA4 forwarding sends anonymized session IDs. Enable only if you have a legal basis or user consent for GA4 data transfer to Google's US servers.

### Webhook

Forward events to any HTTP endpoint. Supports HMAC-SHA256 payload signing and retry with exponential backoff.

```typescript
import { webhook } from "@casoon/trackr/storage/webhook";

const storage = webhook({
  url: "https://api.example.com/events",
  secret: process.env.WEBHOOK_SECRET,        // signs payload → X-Trackr-Signature header
  headers: { Authorization: "Bearer ..." },
  retry: { attempts: 3, baseDelay: 500 },    // retries on 5xx with exponential backoff
});
```

### Multi (fan-out to multiple adapters)

```typescript
import { multi } from "@casoon/trackr/storage/multi";
import { postgres } from "@casoon/trackr/storage/postgres";
import { ga4 } from "@casoon/trackr/storage/ga4";

const storage = multi(
  postgres(process.env.DATABASE_URL),
  ga4({ measurementId: "G-XXXXXXXXXX", apiSecret: process.env.GA4_API_SECRET })
);
```

### Batch (buffer & flush)

Wraps any adapter. Buffers events in memory and flushes on size threshold or time interval. Uses `saveBatch()` when the wrapped adapter supports it (e.g. webhook), otherwise calls `save()` for each event.

```typescript
import { batch } from "@casoon/trackr/storage/batch";
import { webhook } from "@casoon/trackr/storage/webhook";

const storage = batch(
  webhook({ url: "https://api.example.com/events", secret: "s3cret" }),
  { maxSize: 20, maxWait: 10_000 }          // flush every 20 events or 10s
);

// Graceful shutdown
process.on("SIGTERM", () => storage.flush());
```

## Pixel Tracking

For email open tracking or no-JS environments:

```typescript
import { createPixelHandler } from "@casoon/trackr/server/pixel";
import { postgres } from "@casoon/trackr/storage/postgres";

const pixelHandler = createPixelHandler({
  storage: postgres(process.env.DATABASE_URL),
  privacy: { anonymizeIp: true }
});

// Returns a transparent 1x1 GIF + records a pageview
export const GET = async ({ request }) => pixelHandler(request);
```

```html
<img src="https://your-api.com/pixel.gif?url=https://your-site.com/page" width="1" height="1" />
```

## Privacy Features

- **IP Anonymization** - Last octet removed before any processing
- **PII Filtering** - Email, phone, tokens stripped from URLs
- **No Cookies** - Session derived from anonymized IP + UA + date (daily rotating)
- **Bot Filtering** - Common crawlers excluded
- **UTM Extraction** - Campaign params captured client-side (prefix stripped: `utm_source` → `source`)
- **OS Detection** - Server-side from User-Agent, not stored raw

## License

LGPL-3.0-or-later
