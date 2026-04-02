import { describe, expect, it } from "vitest";
import { anonymizeIp, stripPii } from "../src/server/privacy.js";
import { createSessionId } from "../src/server/privacy.js";

describe("anonymizeIp", () => {
  it("removes last octet from IPv4", () => {
    expect(anonymizeIp("192.168.1.99")).toBe("192.168.1.0");
  });

  it("handles all zeros IPv4", () => {
    expect(anonymizeIp("0.0.0.0")).toBe("0.0.0.0");
  });

  it("truncates IPv6 to first 4 groups", () => {
    const result = anonymizeIp("2001:db8:85a3:0:0:8a2e:370:7334");
    expect(result).toBe("2001:db8:85a3:0::");
  });

  it("handles short IPv6", () => {
    const result = anonymizeIp("::1");
    expect(result).toMatch(/::/);
  });
});

describe("stripPii", () => {
  it("removes email param from URL", () => {
    const result = stripPii("/page?email=user@example.com&ref=home");
    expect(result).not.toContain("email");
    expect(result).toContain("ref=home");
  });

  it("removes token param", () => {
    const result = stripPii("/reset?token=abc123&lang=de");
    expect(result).not.toContain("token");
    expect(result).toContain("lang=de");
  });

  it("removes password param", () => {
    const result = stripPii("/login?password=secret");
    expect(result).not.toContain("password");
  });

  it("removes key param", () => {
    const result = stripPii("/api?key=sk-abc123");
    expect(result).not.toContain("key");
  });

  it("leaves non-PII params untouched", () => {
    const result = stripPii("/shop?category=shoes&sort=price");
    expect(result).toContain("category=shoes");
    expect(result).toContain("sort=price");
  });

  it("treats path-like strings as paths (no crash)", () => {
    // stripPii uses URL(x, 'http://localhost') so bare strings become paths
    const result = stripPii("not-a-url");
    expect(typeof result).toBe("string");
    expect(result).not.toContain("password");
  });
});

describe("createSessionId", () => {
  it("returns a non-empty string", () => {
    const id = createSessionId("192.168.1.0", "Mozilla/5.0", "2026-04-03");
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("is deterministic for same inputs", () => {
    const a = createSessionId("1.2.3.0", "ua", "2026-04-03");
    const b = createSessionId("1.2.3.0", "ua", "2026-04-03");
    expect(a).toBe(b);
  });

  it("differs by date", () => {
    const a = createSessionId("1.2.3.0", "ua", "2026-04-03");
    const b = createSessionId("1.2.3.0", "ua", "2026-04-04");
    expect(a).not.toBe(b);
  });

  it("differs by UA", () => {
    const a = createSessionId("1.2.3.0", "Chrome", "2026-04-03");
    const b = createSessionId("1.2.3.0", "Firefox", "2026-04-03");
    expect(a).not.toBe(b);
  });

  it("is max 16 chars", () => {
    const id = createSessionId("1.2.3.4", "ua", "2026-01-01");
    expect(id.length).toBeLessThanOrEqual(16);
  });
});
