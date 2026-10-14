---
title: Privacy
description: What the client sends, what the handler removes or derives, and what ends up in storage.
order: 1
---

## In the browser

The client sets no cookies and uses neither `localStorage` nor `sessionStorage`. Each event
contains:

- `type`, `url` (path plus query string) and `ts` (milliseconds),
- for pageviews: the referrer's **hostname** only, and the UTM parameters found in the URL,
  with the `utm_` prefix removed (`utm_source` → `source`),
- for custom events: `name` and the properties passed to `track()`.

## In the handler

Privacy options are merged with defaults: `anonymizeIp` and `stripPii` are `true` unless you
set them to `false`.

### `stripPii`

Query parameters are removed from `url` when their name matches one of these patterns
(case-insensitive): `email`/`mail`, `phone`, `name` and `first_name`/`last_name`/`full_name`/`user_name`/`display_name`,
`token`/`key`/`password`/`passwd`/`pass`/`secret`/`api_key`,
`address`/`street`/`city`/`zip`/`postal_code`, `user_id`/`uid`/`login`/`username`/`user`,
`ssn`/`social`/`tax_id`/`national_id`, `credit_card`/`card_number`/`cvv`/`cc`/`ccn`,
`ip_address`, `dob`/`date_of_birth`/`birthday`. Underscores may also be hyphens or left out.

Email addresses inside the URL **path** are replaced by `[redacted]`.

Event properties are sanitized the same way: a property whose name matches a pattern gets
the value `[redacted]`; email addresses inside string values are replaced by `[redacted]`.

`stripQueryParams` removes further parameters from `url`. A trailing `*` matches a prefix:

```ts
createHandler({
  storage,
  privacy: { stripQueryParams: ["fbclid", "gclid", "mc_*"] },
});
```

### `anonymizeIp` and the session ID

The client IP is read from `X-Forwarded-For` (first entry) or `X-Real-IP`. With
`anonymizeIp`, the handler sets the last IPv4 octet to `0` (IPv6: keeps the first four
groups), hashes `anonymized IP | User-Agent | date` with SHA-256 and stores the first 16 hex
characters as `sessionId`. The date is the UTC day, so the same visitor gets a new ID every day.
With `anonymizeIp: false` no session ID is set.

Neither the IP nor the full User-Agent is stored. The handler stores the device class
(`desktop`, `mobile`, `tablet`), the browser (`Firefox`, `Edge`, `Chrome`, `Safari`, `Other`)
and the OS (`Android`, `iOS`, `Windows`, `ChromeOS`, `macOS`, `Linux`, `Other`).

### `botFilter`

With `botFilter: true`, a request is treated as a bot and answered with `200 OK` without
storing anything when:

- the User-Agent matches one of these patterns (case-insensitive): bot, crawler, spider,
  crawling, headless, phantom, selenium, google, bing, yahoo, baidu, facebook, twitter,
  linkedin, slack, discord, telegram, preview, curl, wget, monitoring, uptime, pingdom,
- the request has no `Accept-Language` header, or
- the User-Agent is shorter than 20 characters.

## Example

A custom event whose path and properties contain an email address, as stored (captured by
`examples/capture.mjs`):

```json
{
  "type": "event",
  "name": "signup_click",
  "url": "/users/[redacted]/settings",
  "props": {
    "plan": "pro",
    "email": "[redacted]",
    "note": "reply to [redacted]",
    "seats": 3
  },
  "ts": 1791961260000,
  "sessionId": "6a903f454a1bbf75",
  "device": "mobile",
  "browser": "Chrome",
  "os": "Android"
}
```

The request it came from is in `examples/requests.json`.

## Forwarding to third parties

The GA4 adapter sends events to Google from your server. Google receives your server's IP,
not the visitor's, and the session ID as `client_id`. Data is still processed by Google;
whether that needs consent or a data processing agreement depends on your use case.
