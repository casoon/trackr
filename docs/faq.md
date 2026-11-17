---
title: FAQ
description: Cookie banner, use without Astro, and running alongside GA4.
order: 9
---

## Does trackr need a cookie banner?

The client sets no cookies, uses neither `localStorage` nor `sessionStorage`, and the handler
stores neither the IP nor the full User-Agent (see [Privacy](../guides/privacy/)). A consent
banner for trackr itself is therefore usually not needed. Whether that holds for your site,
including everything else it loads, is for you to assess; this is not legal advice.

## Does it work without Astro?

Yes. The examples use Astro, but the server handler takes a web `Request` and returns a
`Response`, and the package ships `script.js`, a browser build that exposes `window.trackr`.
Copy it to your public folder and load it with a script tag, no build step needed; see
[Installation](../getting-started/installation/).

## Can I run it alongside GA4?

Yes. The GA4 adapter forwards events from your server to the Measurement Protocol, so Google's
script is not loaded in the browser; combine it with another adapter through `multi()`, see
[Storage adapters](../guides/storage/). The data still goes to Google, so that transfer needs
its own legal basis, such as consent or a data processing agreement. See
[Forwarding to third parties](../guides/privacy/).
