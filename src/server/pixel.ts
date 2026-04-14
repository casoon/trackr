import type { HandlerConfig, TrackrEvent } from "../types.js";
import { isBot } from "./bot.js";
import { applyPrivacy, createSessionId, resolvePrivacyConfig } from "./privacy.js";

/**
 * Creates a handler for pixel tracking — returns a 1×1 transparent GIF
 * and records a pageview event based on query parameters.
 *
 * Use this for tracking email opens, external embeds, or any context
 * where JavaScript is unavailable.
 *
 * Query parameters:
 *   url   — the page/context being tracked (required)
 *   ref   — referrer (optional)
 *
 * Usage:
 *   import { createPixelHandler } from "@casoon/trackr/server/pixel";
 *   import { postgres } from "@casoon/trackr/storage/postgres";
 *
 *   const pixel = createPixelHandler({
 *     storage: postgres(process.env.DATABASE_URL),
 *     privacy: { anonymizeIp: true, stripPii: true },
 *     botFilter: true,
 *   });
 *
 *   // In your route handler (Hono, Cloudflare Workers, etc.):
 *   app.get("/pixel.gif", (req) => pixel(req));
 */

// Minimal 1×1 transparent GIF (35 bytes)
const TRANSPARENT_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

const GIF_RESPONSE = new Response(TRANSPARENT_GIF, {
  status: 200,
  headers: {
    "Content-Type": "image/gif",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  },
});

export function createPixelHandler(
  config: HandlerConfig,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (config.botFilter && isBot(request)) {
      return GIF_RESPONSE.clone();
    }

    try {
      const reqUrl = new URL(request.url);
      const trackedUrl = reqUrl.searchParams.get("url");

      if (!trackedUrl) {
        return GIF_RESPONSE.clone();
      }

      let event: TrackrEvent = {
        type: "pageview",
        url: trackedUrl,
        referrer: reqUrl.searchParams.get("ref") ?? undefined,
        ts: Date.now(),
      };

      const privacy = resolvePrivacyConfig(config.privacy);
      event = applyPrivacy(event, privacy);

      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "0.0.0.0";
      const ua = request.headers.get("user-agent") || "";
      const today = new Date().toISOString().split("T")[0];

      if (privacy.anonymizeIp) {
        event.sessionId = await createSessionId(ip, ua, today);
      }

      await config.storage.save(event);
    } catch {
      // Always return the GIF — never let tracking errors break the response
    }

    return GIF_RESPONSE.clone();
  };
}
