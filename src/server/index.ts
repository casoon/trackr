import type { HandlerConfig, TrackrEvent } from "../types.js";
import { isBot } from "./bot.js";
import { applyPrivacy, createSessionId } from "./privacy.js";

interface RawEvent {
  type: string;
  url: string;
  ts: number;
  name?: string;
  referrer?: string;
  props?: Record<string, string | number | boolean>;
}

export function createHandler(
  config: HandlerConfig,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    if (config.botFilter && isBot(request)) {
      return new Response("OK");
    }

    try {
      const body = (await request.json()) as unknown;

      if (!isValidEvent(body)) {
        return new Response("Invalid event", { status: 400 });
      }

      let event: TrackrEvent = {
        type: body.type as "pageview" | "event",
        name: body.name,
        url: body.url,
        referrer: body.referrer,
        props: body.props,
        ts: body.ts,
      };

      if (config.privacy) {
        event = applyPrivacy(event, config.privacy);
      }

      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "0.0.0.0";
      const ua = request.headers.get("user-agent") || "";
      const today = new Date().toISOString().split("T")[0];

      if (config.privacy?.anonymizeIp !== false) {
        event.sessionId = createSessionId(ip, ua, today);
      }

      event.device = detectDevice(ua);
      event.browser = detectBrowser(ua);
      event.os = detectOs(ua);

      await config.storage.save(event);

      return new Response("OK");
    } catch {
      return new Response("Error", { status: 500 });
    }
  };
}

function isValidEvent(e: unknown): e is RawEvent {
  if (typeof e !== "object" || e === null) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj.type === "string" &&
    typeof obj.url === "string" &&
    typeof obj.ts === "number"
  );
}

function detectDevice(ua: string): "desktop" | "mobile" | "tablet" {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser(ua: string): string {
  if (/firefox/i.test(ua)) return "Firefox";
  if (/edg/i.test(ua)) return "Edge";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

function detectOs(ua: string): string {
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/cros/i.test(ua)) return "ChromeOS";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

export { isBot } from "./bot.js";
export { anonymizeIp, applyPrivacy, stripPii } from "./privacy.js";
