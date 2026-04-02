import type { StorageAdapter, TrackrEvent } from "../types.js";

/**
 * GA4 Measurement Protocol adapter.
 *
 * Forwards trackr events server-side to Google Analytics 4 using the
 * Measurement Protocol — no GA script is loaded in the browser.
 *
 * Privacy notes (operator responsibility):
 * - client_id is derived from trackr's anonymized sessionId (daily-rotating
 *   hash of anonymized IP + User-Agent). No raw IP or persistent cookie is sent.
 * - IP forwarding to Google: the Measurement Protocol request originates from
 *   your server, not the visitor's browser. Google receives your server's IP,
 *   not the visitor's.
 * - Data is still processed by Google LLC. Depending on your jurisdiction and
 *   use case this may require a consent mechanism and/or DPA with Google.
 * - Set `nonPersonalizedAds: true` (default) to opt out of ad personalization.
 *
 * @see https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */

export interface Ga4Config {
  /** GA4 Measurement ID, e.g. "G-XXXXXXXXXX" */
  measurementId: string;
  /** GA4 API secret (create in GA Admin → Data Streams → Measurement Protocol) */
  apiSecret: string;
  /**
   * Send to the GA4 validation / debug endpoint instead of the live endpoint.
   * Useful during development — events are NOT recorded in GA.
   * @default false
   */
  debug?: boolean;
  /**
   * Instruct Google not to use events for ad personalization.
   * Maps to `non_personalized_ads` in the event payload.
   * @default true
   */
  nonPersonalizedAds?: boolean;
  /**
   * Strip these query parameters from the page URL before forwarding to GA.
   * Useful to keep internal tracking params (e.g. "ref", "campaign_id") out of GA.
   * Supports trailing wildcards: "fbclid*" removes all params starting with "fbclid".
   */
  stripQueryParams?: string[];
}

interface Ga4Payload {
  client_id: string;
  non_personalized_ads?: boolean;
  events: Ga4Event[];
}

interface Ga4Event {
  name: string;
  params: Record<string, string | number | boolean>;
}

/** GA4 event names that are reserved and must not be used. */
const GA4_RESERVED_NAMES = new Set([
  "ad_activeview",
  "ad_click",
  "ad_exposure",
  "ad_impression",
  "ad_query",
  "adunit_exposure",
  "app_clear_data",
  "app_exception",
  "app_install",
  "app_remove",
  "app_store_refund",
  "app_update",
  "app_upgrade",
  "dynamic_link_app_open",
  "dynamic_link_app_update",
  "dynamic_link_first_open",
  "error",
  "firebase_campaign",
  "first_open",
  "first_visit",
  "in_app_purchase",
  "notification_dismiss",
  "notification_foreground",
  "notification_open",
  "notification_receive",
  "os_update",
  "session_start",
  "user_engagement",
]);

/**
 * Sanitize an event name to comply with GA4 naming rules:
 * - Must start with a letter
 * - Only letters, digits, underscores
 * - Max 40 characters
 * - Must not be a reserved name
 */
function sanitizeEventName(name: string): string {
  let sanitized = name
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^[^a-zA-Z]+/, "")
    .slice(0, 40);

  if (!sanitized) sanitized = "custom_event";
  if (GA4_RESERVED_NAMES.has(sanitized)) sanitized = `trackr_${sanitized}`;

  return sanitized;
}

function stripParams(url: string, params: string[]): string {
  try {
    const u = new URL(url, "http://localhost");
    for (const p of params) {
      if (p.endsWith("*")) {
        const prefix = p.slice(0, -1);
        for (const key of [...u.searchParams.keys()]) {
          if (key.startsWith(prefix)) u.searchParams.delete(key);
        }
      } else {
        u.searchParams.delete(p);
      }
    }
    // Reconstruct with origin if the original URL had one
    try {
      const original = new URL(url);
      return original.origin + u.pathname + (u.search || "");
    } catch {
      return u.pathname + (u.search || "");
    }
  } catch {
    return url;
  }
}

function buildPayload(event: TrackrEvent, config: Ga4Config): Ga4Payload {
  const clientId = event.sessionId ?? `anon_${event.ts}`;
  const nonPersonalizedAds = config.nonPersonalizedAds !== false;

  const pageUrl =
    config.stripQueryParams?.length
      ? stripParams(event.url, config.stripQueryParams)
      : event.url;

  const baseParams: Record<string, string | number | boolean> = {
    session_id: clientId,
    engagement_time_msec: 1,
  };

  if (event.country) baseParams.country = event.country;
  if (event.device) baseParams.device_category = event.device;
  if (event.browser) baseParams.browser = event.browser;

  let ga4Event: Ga4Event;

  if (event.type === "pageview") {
    ga4Event = {
      name: "page_view",
      params: {
        ...baseParams,
        page_location: pageUrl,
        ...(event.referrer ? { page_referrer: event.referrer } : {}),
      },
    };
  } else {
    const name = sanitizeEventName(event.name ?? "custom_event");
    const props: Record<string, string | number | boolean> = {};

    if (event.props) {
      for (const [k, v] of Object.entries(event.props)) {
        // GA4 allows max 25 custom params, key max 40 chars, value max 100 chars
        const safeKey = k.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40);
        const safeVal =
          typeof v === "string" ? v.slice(0, 100) : v;
        props[safeKey] = safeVal;
      }
    }

    ga4Event = {
      name,
      params: {
        ...baseParams,
        page_location: pageUrl,
        ...props,
      },
    };
  }

  return {
    client_id: clientId,
    ...(nonPersonalizedAds ? { non_personalized_ads: true } : {}),
    events: [ga4Event],
  };
}

export function ga4(config: Ga4Config): StorageAdapter {
  const base = config.debug
    ? "https://www.google-analytics.com/debug/mp/collect"
    : "https://www.google-analytics.com/mp/collect";

  const endpoint = `${base}?measurement_id=${encodeURIComponent(config.measurementId)}&api_secret=${encodeURIComponent(config.apiSecret)}`;

  return {
    async save(event: TrackrEvent): Promise<void> {
      const payload = buildPayload(event, config);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(
          `GA4 Measurement Protocol error: ${res.status} ${res.statusText}`,
        );
      }
    },
  };
}
