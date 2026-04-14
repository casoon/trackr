import { createHmac } from "node:crypto";
import type { StorageAdapter, TrackrEvent } from "../types.js";

export interface WebhookConfig {
  /** Target URL to POST events to */
  url: string;
  /** Additional HTTP headers */
  headers?: Record<string, string>;
  /** HMAC-SHA256 secret — when set, adds X-Trackr-Signature header */
  secret?: string;
  /** Transform event before sending */
  transform?: (event: TrackrEvent) => unknown;
  /** Retry options for failed requests (default: no retry) */
  retry?: {
    /** Max number of retries (default: 3) */
    attempts?: number;
    /** Base delay in ms, doubled on each retry (default: 500) */
    baseDelay?: number;
  };
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

async function sendWithRetry(
  url: string,
  body: string,
  headers: Record<string, string>,
  attempts: number,
  baseDelay: number,
): Promise<void> {
  for (let i = 0; i <= attempts; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    if (res.ok) return;

    if (i < attempts && res.status >= 500) {
      await new Promise((r) => setTimeout(r, baseDelay * 2 ** i));
      continue;
    }

    throw new Error(`Webhook failed: ${res.status} ${res.statusText}`);
  }
}

export function webhook(config: WebhookConfig): StorageAdapter {
  const maxAttempts = config.retry?.attempts ?? 0;
  const baseDelay = config.retry?.baseDelay ?? 500;

  function buildHeaders(body: string): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...config.headers,
    };
    if (config.secret) {
      headers["X-Trackr-Signature"] = sign(body, config.secret);
    }
    return headers;
  }

  function transformOne(event: TrackrEvent): unknown {
    return config.transform ? config.transform(event) : event;
  }

  return {
    async save(event: TrackrEvent): Promise<void> {
      const body = JSON.stringify(transformOne(event));
      await sendWithRetry(config.url, body, buildHeaders(body), maxAttempts, baseDelay);
    },

    async saveBatch(events: TrackrEvent[]): Promise<void> {
      const payload = events.map(transformOne);
      const body = JSON.stringify(payload);
      await sendWithRetry(config.url, body, buildHeaders(body), maxAttempts, baseDelay);
    },
  };
}
