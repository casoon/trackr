# Changelog

All notable changes to @casoon/trackr are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.3.1] - 2026-10-27

### Fixed

- **npm:** `package.json` names the repository, homepage and issue tracker, which the npm page shows and which npm provenance requires.

### Changed

- **Releases:** the package is published from a release workflow with npm Trusted Publishing (provenance, no stored token), after approval in the `npm` environment.

## [0.3.0] - 2026-10-14

### Added

- `utm` on `TrackrEvent`: the server handler passes the UTM object from the request body through to storage.
- `migrations/001_create_trackr_events.sql` with the `trackr_events` table and its indexes, shipped in the package.

### Changed

- The Postgres adapter writes the `os` and `utm` (JSONB) columns.

## [0.2.0] - 2026-04-14

### Added

- `storage/ga4`: server-side forwarding to the GA4 Measurement Protocol, no GA script in the browser.
- `storage/multi`: fan-out of every event to several adapters.
- `storage/webhook`: POST events to any URL, with HMAC-SHA256 signature (`X-Trackr-Signature`) and retry with exponential backoff on 5xx.
- `storage/batch`: buffers events and flushes by size or time, using `saveBatch()` where the wrapped adapter has it.
- `server/pixel`: `createPixelHandler()` answers with a transparent 1×1 GIF and records a pageview.
- `os` on `TrackrEvent`, detected from the User-Agent on the server.
- SPA tracking: `pushState`, `replaceState`, `popstate` and `hashchange` record a pageview.
- `script.js`: browser build as an IIFE exposing `window.trackr`.
- PII key patterns for query parameters and `sanitizeProps()` for event properties; email addresses in URL paths and string properties are redacted.

### Changed

- Session IDs are a SHA-256 hash of anonymized IP, User-Agent and date (16 hex characters).
- Privacy protections (`anonymizeIp`, `stripPii`) are on by default.

### Fixed

- UTM keys are stored without the `utm_` prefix.
- `sendBeacon` sends `Content-Type: application/json`.

## [0.1.1] - 2025-12-13

### Added

- The client extracts `utm_source`, `utm_medium`, `utm_campaign`, `utm_term` and `utm_content` and sends the full path including the query string.

## [0.1.0] - 2025-12-13

### Added

- Client `init()` and `track()`, server `createHandler()` with bot filter and privacy options, Postgres and external-API storage adapters.
