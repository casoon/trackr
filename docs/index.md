---
title: Overview
description: What trackr does, where it stops, and how this documentation is organised.
order: 0
---

`@casoon/trackr` collects pageviews and custom events from a website and stores them on
infrastructure you run. It has two halves: a browser client (`init()`, `track()`) that sends
events with `sendBeacon`, and a server handler (`createHandler()`) that filters bots, removes
personal data, adds a daily session ID and device details, and passes the event to a storage
adapter.

## What it covers

- Pageviews, including navigation in single-page apps, and custom events with properties.
- UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`).
- Device class, browser and operating system, detected from the User-Agent on the server.
- Storage in Postgres, forwarding to a webhook, an HTTP API or GA4, fan-out and batching.
- A tracking pixel for contexts without JavaScript.

## Where it stops

- trackr stores events; it does not ship a reporting UI. The [Postgres guide](guides/database/)
  has SQL for common reports, and a separate dashboard runs at
  [trackr-dashboard.casoon.dev](https://trackr-dashboard.casoon.dev).
- The `country` field exists on events and in the table, but the handler does not fill it.
- Bot detection is a list of User-Agent patterns plus two header checks, not a bot-management
  service.

## How the docs are organised

- **Getting started**: [Installation](getting-started/installation/) and
  [Quickstart](getting-started/quickstart/).
- **Guides**: [Privacy](guides/privacy/), [Storage adapters](guides/storage/),
  [Postgres](guides/database/), [Tracking pixel](guides/pixel/).
- **Reference**: [API](reference/api/) and [Event fields](reference/events/).

The product page is [trackr.casoon.de](https://trackr.casoon.de).
