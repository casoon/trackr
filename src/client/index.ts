import type { TrackrConfig } from "../types.js";

let config: TrackrConfig | null = null;

export function init(options: TrackrConfig): void {
  config = options;
  trackPageview();
  
  if (typeof window !== "undefined") {
    window.addEventListener("popstate", trackPageview);
  }
}

export function track(name: string, props?: Record<string, string | number | boolean>): void {
  if (!config) {
    console.warn("[trackr] Not initialized. Call init() first.");
    return;
  }
  
  sendEvent({
    type: "event",
    name,
    url: getPath(),
    props,
    ts: Date.now()
  });
}

function trackPageview(): void {
  if (!config) return;
  
  sendEvent({
    type: "pageview",
    url: getPath(),
    referrer: document.referrer ? new URL(document.referrer).hostname : undefined,
    ts: Date.now()
  });
}

function getPath(): string {
  return window.location.pathname;
}

function sendEvent(event: Record<string, unknown>): void {
  if (!config) return;
  
  const body = JSON.stringify(event);
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon(config.endpoint, body);
  } else {
    fetch(config.endpoint, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "application/json" }
    }).catch(() => {});
  }
  
  if (config.debug) {
    console.log("[trackr]", event);
  }
}
