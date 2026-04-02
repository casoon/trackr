import type { TrackrConfig } from "../types.js";

let config: TrackrConfig | null = null;

export function init(options: TrackrConfig): void {
  config = options;
  trackPageview();

  if (typeof window !== "undefined") {
    // popstate: back/forward navigation
    window.addEventListener("popstate", trackPageview);

    // hashchange: hash-based SPAs (e.g. Vue Router hash mode)
    window.addEventListener("hashchange", trackPageview);

    // pushState / replaceState: history-based SPAs (React Router, Next.js, etc.)
    patchHistoryMethod("pushState");
    patchHistoryMethod("replaceState");
  }
}

function patchHistoryMethod(method: "pushState" | "replaceState"): void {
  const original = history[method].bind(history);
  // biome-ignore lint/suspicious/noExplicitAny: patching native history API
  (history[method] as any) = function (
    ...args: Parameters<typeof history.pushState>
  ) {
    original(...args);
    trackPageview();
  };
}

export function track(
  name: string,
  props?: Record<string, string | number | boolean>,
): void {
  if (!config) {
    console.warn("[trackr] Not initialized. Call init() first.");
    return;
  }

  sendEvent({
    type: "event",
    name,
    url: getPath(),
    props,
    ts: Date.now(),
  });
}

function trackPageview(): void {
  if (!config) return;

  const utm = getUtmParams();

  sendEvent({
    type: "pageview",
    url: getPath(),
    referrer: document.referrer
      ? new URL(document.referrer).hostname
      : undefined,
    ...(Object.keys(utm).length > 0 && { utm }),
    ts: Date.now(),
  });
}

function getPath(): string {
  return window.location.pathname + window.location.search;
}

function getUtmParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];

  for (const key of keys) {
    const value = params.get(key);
    // Strip utm_ prefix so stats queries work: props->'utm'->>'source'
    if (value) utm[key.replace("utm_", "")] = value;
  }

  return utm;
}

function sendEvent(event: Record<string, unknown>): void {
  if (!config) return;

  const body = JSON.stringify(event);

  if (navigator.sendBeacon) {
    // Use Blob to set Content-Type: application/json — plain string would send as text/plain
    navigator.sendBeacon(
      config.endpoint,
      new Blob([body], { type: "application/json" }),
    );
  } else {
    fetch(config.endpoint, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  }

  if (config.debug) {
    console.log("[trackr]", event);
  }
}
