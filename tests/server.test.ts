import { describe, expect, it } from "vitest";
import { isBot } from "../src/server/bot.js";
import { createHandler } from "../src/server/index.js";
import type { TrackrEvent } from "../src/types.js";

// detectDevice / detectBrowser / detectOs are not exported — test via createHandler
// We test isBot directly and the UA strings that drive detection.

function makeRequest(
  ua: string,
  extraHeaders: Record<string, string> = {},
): Request {
  return new Request("https://example.com/collect", {
    method: "POST",
    headers: {
      "user-agent": ua,
      "accept-language": "en-US,en;q=0.9",
      ...extraHeaders,
    },
  });
}

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MAC_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36";

function postRequest(body: unknown, ua = CHROME_UA): Request {
  return new Request("https://example.com/collect", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": ua,
      "accept-language": "en-US,en;q=0.9",
    },
    body: JSON.stringify(body),
  });
}

describe("createHandler — UTM", () => {
  it("passes utm from request body to saved event", async () => {
    let saved: TrackrEvent | null = null;
    const handler = createHandler({
      storage: {
        save: async (e) => {
          saved = e;
        },
      },
    });

    await handler(
      postRequest({
        type: "pageview",
        url: "/landing",
        ts: 1000,
        utm: { source: "github", medium: "readme", campaign: "trackr" },
      }),
    );

    expect(saved).not.toBeNull();
    expect((saved as TrackrEvent).utm).toEqual({
      source: "github",
      medium: "readme",
      campaign: "trackr",
    });
  });

  it("stores undefined utm when none is sent", async () => {
    let saved: TrackrEvent | null = null;
    const handler = createHandler({
      storage: {
        save: async (e) => {
          saved = e;
        },
      },
    });

    await handler(postRequest({ type: "pageview", url: "/", ts: 1000 }));

    expect((saved as TrackrEvent | null)?.utm).toBeUndefined();
  });
});

describe("createHandler — OS detection", () => {
  it("sets os to Windows for Chrome Windows UA", async () => {
    let saved: TrackrEvent | null = null;
    const handler = createHandler({
      storage: {
        save: async (e) => {
          saved = e;
        },
      },
    });
    await handler(
      postRequest({ type: "pageview", url: "/", ts: 1000 }, CHROME_UA),
    );
    expect((saved as TrackrEvent | null)?.os).toBe("Windows");
  });

  it("sets os to macOS for Safari Mac UA", async () => {
    let saved: TrackrEvent | null = null;
    const handler = createHandler({
      storage: {
        save: async (e) => {
          saved = e;
        },
      },
    });
    await handler(
      postRequest({ type: "pageview", url: "/", ts: 1000 }, MAC_UA),
    );
    expect((saved as TrackrEvent | null)?.os).toBe("macOS");
  });

  it("sets os to Android for Android UA", async () => {
    let saved: TrackrEvent | null = null;
    const handler = createHandler({
      storage: {
        save: async (e) => {
          saved = e;
        },
      },
    });
    await handler(
      postRequest({ type: "pageview", url: "/", ts: 1000 }, ANDROID_UA),
    );
    expect((saved as TrackrEvent | null)?.os).toBe("Android");
  });
});

describe("isBot", () => {
  it("detects Googlebot", () => {
    expect(
      isBot(
        makeRequest(
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        ),
      ),
    ).toBe(true);
  });

  it("detects crawler in UA", () => {
    expect(isBot(makeRequest("AhrefsBot/7.0"))).toBe(true);
  });

  it("detects spider in UA", () => {
    expect(isBot(makeRequest("DuckDuckBot/1.0 spider"))).toBe(true);
  });

  it("flags missing accept-language as bot", () => {
    const req = new Request("https://example.com/collect", {
      method: "POST",
      headers: { "user-agent": "Mozilla/5.0" },
    });
    expect(isBot(req)).toBe(true);
  });

  it("flags very short UA as bot", () => {
    expect(isBot(makeRequest("curl/7.x"))).toBe(true);
  });

  it("passes normal Chrome UA", () => {
    expect(
      isBot(
        makeRequest(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ),
      ),
    ).toBe(false);
  });

  it("passes normal Safari UA", () => {
    expect(
      isBot(
        makeRequest(
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        ),
      ),
    ).toBe(false);
  });

  it("passes normal mobile UA", () => {
    expect(
      isBot(
        makeRequest(
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        ),
      ),
    ).toBe(false);
  });
});
