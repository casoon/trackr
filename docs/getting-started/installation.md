---
title: Installation
description: Requirements, the package entry points, and the optional Postgres driver.
order: 1
---

```sh
pnpm add @casoon/trackr
# or
npm install @casoon/trackr
```

## Requirements

- Node.js 22 or later (`engines` in `package.json`). The server handler uses the web
  `Request`/`Response` API and `crypto.subtle`, so it also fits runtimes that provide them.
- The package is ESM only.
- For the Postgres adapter: the `pg` driver. It is an optional dependency and is loaded only
  when you pass a connection string; pass your own client and `pg` is not needed.

The webhook adapter signs payloads with `node:crypto`, so it needs a runtime that provides that
module.

## Entry points

| Import | Contents |
| --- | --- |
| `@casoon/trackr` | `init`, `track`, `createHandler` and the types |
| `@casoon/trackr/client` | `init`, `track` |
| `@casoon/trackr/server` | `createHandler`, `isBot`, privacy helpers |
| `@casoon/trackr/server/pixel` | `createPixelHandler` |
| `@casoon/trackr/storage/postgres` | `postgres` |
| `@casoon/trackr/storage/api` | `api` |
| `@casoon/trackr/storage/webhook` | `webhook` |
| `@casoon/trackr/storage/ga4` | `ga4` |
| `@casoon/trackr/storage/multi` | `multi` |
| `@casoon/trackr/storage/batch` | `batch` |

## Without a build step

The package also contains `script.js`, a minified browser build that exposes `window.trackr`
with `init` and `track`. Copy it from `node_modules/@casoon/trackr/script.js` into your public
folder and serve it from your own origin:

```html
<script src="/trackr.js"></script>
<script>
  trackr.init({ endpoint: "/api/track" });
</script>
```

Next: [Quickstart](../quickstart/).
