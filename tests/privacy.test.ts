import { describe, expect, it } from "vitest";
import {
  anonymizeIp,
  createSessionId,
  resolvePrivacyConfig,
  sanitizeProps,
  stripPii,
} from "../src/server/privacy.js";

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

  it("removes firstname and lastname params", () => {
    const result = stripPii("/signup?firstname=John&lastname=Doe&plan=pro");
    expect(result).not.toContain("firstname");
    expect(result).not.toContain("lastname");
    expect(result).toContain("plan=pro");
  });

  it("removes user_id and uid params", () => {
    const result = stripPii("/profile?user_id=123&tab=settings");
    expect(result).not.toContain("user_id");
    expect(result).toContain("tab=settings");
  });

  it("removes ssn and address params", () => {
    const result = stripPii("/form?ssn=123-45-6789&address=Main+St&step=2");
    expect(result).not.toContain("ssn");
    expect(result).not.toContain("address");
    expect(result).toContain("step=2");
  });

  it("leaves non-PII params untouched", () => {
    const result = stripPii("/shop?category=shoes&sort=price");
    expect(result).toContain("category=shoes");
    expect(result).toContain("sort=price");
  });

  it("redacts email in URL path", () => {
    const result = stripPii("/user/john@example.com/profile");
    expect(result).not.toContain("john@example.com");
    expect(result).toContain("[redacted]");
    expect(result).toContain("/profile");
  });

  it("redacts multiple emails in URL path", () => {
    const result = stripPii("/compare/a@b.com/vs/c@d.com");
    expect(result).not.toContain("a@b.com");
    expect(result).not.toContain("c@d.com");
  });

  it("treats path-like strings as paths (no crash)", () => {
    const result = stripPii("not-a-url");
    expect(typeof result).toBe("string");
    expect(result).not.toContain("password");
  });
});

describe("sanitizeProps", () => {
  it("redacts value for PII key: email", () => {
    const result = sanitizeProps({ email: "user@example.com", page: "/home" });
    expect(result.email).toBe("[redacted]");
    expect(result.page).toBe("/home");
  });

  it("redacts value for PII key: user_id", () => {
    const result = sanitizeProps({ user_id: "abc-123" });
    expect(result.user_id).toBe("[redacted]");
  });

  it("redacts value for PII key: password", () => {
    const result = sanitizeProps({ password: "s3cret!" });
    expect(result.password).toBe("[redacted]");
  });

  it("redacts email pattern in string value", () => {
    const result = sanitizeProps({ note: "contact john@example.com for info" });
    expect(result.note).not.toContain("john@example.com");
    expect(result.note).toContain("[redacted]");
  });

  it("leaves numeric and boolean values untouched", () => {
    const result = sanitizeProps({ count: 42, active: true });
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
  });

  it("leaves clean string values untouched", () => {
    const result = sanitizeProps({ plan: "pro", source: "google" });
    expect(result.plan).toBe("pro");
    expect(result.source).toBe("google");
  });
});

describe("resolvePrivacyConfig", () => {
  it("returns defaults when config is undefined", () => {
    const result = resolvePrivacyConfig(undefined);
    expect(result.anonymizeIp).toBe(true);
    expect(result.stripPii).toBe(true);
  });

  it("preserves explicit false overrides", () => {
    const result = resolvePrivacyConfig({ stripPii: false });
    expect(result.anonymizeIp).toBe(true);
    expect(result.stripPii).toBe(false);
  });

  it("preserves explicit values", () => {
    const result = resolvePrivacyConfig({ anonymizeIp: false, stripPii: false });
    expect(result.anonymizeIp).toBe(false);
    expect(result.stripPii).toBe(false);
  });
});

describe("createSessionId", () => {
  it("returns a non-empty string", async () => {
    const id = await createSessionId("192.168.1.0", "Mozilla/5.0", "2026-04-03");
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("is deterministic for same inputs", async () => {
    const a = await createSessionId("1.2.3.0", "ua", "2026-04-03");
    const b = await createSessionId("1.2.3.0", "ua", "2026-04-03");
    expect(a).toBe(b);
  });

  it("differs by date", async () => {
    const a = await createSessionId("1.2.3.0", "ua", "2026-04-03");
    const b = await createSessionId("1.2.3.0", "ua", "2026-04-04");
    expect(a).not.toBe(b);
  });

  it("differs by UA", async () => {
    const a = await createSessionId("1.2.3.0", "Chrome", "2026-04-03");
    const b = await createSessionId("1.2.3.0", "Firefox", "2026-04-03");
    expect(a).not.toBe(b);
  });

  it("is exactly 16 hex chars", async () => {
    const id = await createSessionId("1.2.3.4", "ua", "2026-01-01");
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });
});
