# @casoon/trackr

Privacy-first, GDPR-native analytics for static sites. No cookies, no persistent IDs, self-hosted.

## Live Demo

Test the library in action:

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
- **Astro-First** - Designed for Astro, works with any static site
- **Flexible Storage** - Postgres or external API (Plausible, Umami)

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
  props JSONB DEFAULT  '{}'
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

## Privacy Features

- **IP Anonymization** - Last octet removed before processing
- **PII Filtering** - Email, phone, tokens stripped from URLs
- **No Cookies** - Session derived from anonymized IP + UA + date
- **Bot Filtering** - Common bots excluded
- **UTM Extraction** - Campaign params captured client-side

## License

LGPL-3.0-or-later
