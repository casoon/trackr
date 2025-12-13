# @casoon/trackr

Privacy-first, GDPR-native analytics for static sites. No cookies, no persistent IDs, self-hosted.

## Features

- **Privacy by Default** - No cookies, no localStorage, no fingerprinting
- **Lightweight** - Client script < 1KB gzipped
- **Self-Hosted** - Your data stays on your infrastructure
- **Astro-First** - Designed for Astro, works with any static site
- **Flexible Storage** - Postgres or external API (Plausible, Umami)

## Installation

```bash
pnpm add @casoon/trackr
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

Include in your layout:

```astro
---
import Analytics from "../components/Analytics.astro";
---
<html>
  <body>
    <slot />
    <Analytics />
  </body>
</html>
```

### 2. Create the API endpoint

```typescript
// src/pages/api/track.ts
import type { APIRoute } from "astro";
import { createHandler } from "@casoon/trackr/server";
import { postgres } from "@casoon/trackr/storage/postgres";

const handler = createHandler({
  storage: postgres(import.meta.env.DATABASE_URL),
  privacy: {
    anonymizeIp: true,
    stripPii: true
  },
  botFilter: true
});

export const POST: APIRoute = async ({ request }) => {
  return handler(request);
};
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
  country TEXT,
  device TEXT,
  browser TEXT,
  session_id TEXT,
  props JSONB DEFAULT '{}'
);

CREATE INDEX idx_trackr_ts ON trackr_events (ts);
CREATE INDEX idx_trackr_url ON trackr_events (url);
```

## Custom Events

```typescript
import { track } from "@casoon/trackr/client";

// Track button click
document.querySelector("#signup").addEventListener("click", () => {
  track("signup_click", { plan: "pro" });
});
```

## Storage Adapters

### Postgres

```typescript
import { postgres } from "@casoon/trackr/storage/postgres";

const storage = postgres(process.env.DATABASE_URL);
```

### External API

Forward events to Plausible, Umami, or any other service:

```typescript
import { api } from "@casoon/trackr/storage/api";

const storage = api({
  url: "https://plausible.io/api/event",
  headers: { "Authorization": "Bearer ..." },
  transform: (event) => ({
    name: event.type === "pageview" ? "pageview" : event.name,
    url: event.url,
    domain: "your-domain.com"
  })
});
```

## Privacy Features

- **IP Anonymization** - Last octet removed before any processing
- **PII Filtering** - Email, phone, tokens stripped from URLs
- **No Cookies** - Session ID derived from anonymized IP + UA + date
- **Bot Filtering** - Common bots and crawlers excluded

## License

LGPL-3.0-or-later

## Author

Joern Seidel <joern@casoon.de>
