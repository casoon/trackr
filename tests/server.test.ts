import { describe, expect, it } from "vitest";
import { isBot } from "../src/server/bot.js";

// detectDevice / detectBrowser / detectOs are not exported — test via createHandler
// We test isBot directly and the UA strings that drive detection.

function makeRequest(ua: string, extraHeaders: Record<string, string> = {}): Request {
  return new Request("https://example.com/collect", {
    method: "POST",
    headers: {
      "user-agent": ua,
      "accept-language": "en-US,en;q=0.9",
      ...extraHeaders,
    },
  });
}

describe("isBot", () => {
  it("detects Googlebot", () => {
    expect(isBot(makeRequest("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"))).toBe(true);
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
    expect(isBot(makeRequest(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ))).toBe(false);
  });

  it("passes normal Safari UA", () => {
    expect(isBot(makeRequest(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
    ))).toBe(false);
  });

  it("passes normal mobile UA", () => {
    expect(isBot(makeRequest(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    ))).toBe(false);
  });
});
