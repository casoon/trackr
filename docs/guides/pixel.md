---
title: Tracking pixel
description: Record pageviews from email and pages without JavaScript with a transparent GIF.
order: 4
---

```ts
// src/pages/pixel.gif.ts
import { createPixelHandler } from "@casoon/trackr/server/pixel";
import { postgres } from "@casoon/trackr/storage/postgres";

export const prerender = false;

const pixel = createPixelHandler({
  storage: postgres(import.meta.env.DATABASE_URL),
  privacy: { anonymizeIp: true, stripPii: true },
  botFilter: true,
});

export const GET = async ({ request }) => pixel(request);
```

```html
<img src="https://example.com/pixel.gif?url=/newsletter/october&ref=mail" width="1" height="1" alt="" />
```

Query parameters:

- `url` (required): the page or context to record. Without it, nothing is stored.
- `ref` (optional): stored as `referrer`.

The handler takes the same configuration as `createHandler()` and applies the same privacy
steps and session ID. It does not detect device, browser or OS. Whatever happens, including
bot requests and storage errors, the response is a 43-byte transparent GIF with
`Cache-Control: no-store, no-cache, must-revalidate`, so a broken backend never shows up as a
broken image.

Captured by `examples/capture.mjs`, stored event for the `<img>` above:

```json
{
  "type": "pageview",
  "url": "/newsletter/october",
  "referrer": "mail",
  "ts": 1791961200000,
  "sessionId": "6217de67bbf5a139"
}
```
