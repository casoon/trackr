import { describe, expect, it, vi } from "vitest";
import { postgres } from "../src/storage/postgres.js";
import type { TrackrEvent } from "../src/types.js";

function makeMockClient() {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  return { query };
}

describe("postgres adapter — save INSERT shape", () => {
  it("inserts all scalar fields including os", async () => {
    const client = makeMockClient();
    const adapter = postgres(client);
    const event: TrackrEvent = {
      type: "pageview",
      url: "/test",
      referrer: "example.com",
      country: "DE",
      device: "desktop",
      browser: "Chrome",
      os: "Windows",
      sessionId: "abc123",
      ts: 1_700_000_000_000,
    };

    await adapter.save(event);

    expect(client.query).toHaveBeenCalledOnce();
    const [sql, params] = client.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("os");
    expect(params[7]).toBe("Windows");
  });

  it("inserts utm as JSON string when present", async () => {
    const client = makeMockClient();
    const adapter = postgres(client);
    const event: TrackrEvent = {
      type: "pageview",
      url: "/landing",
      ts: 1_700_000_000_000,
      utm: { source: "github", medium: "readme" },
    };

    await adapter.save(event);

    const [sql, params] = client.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("utm");
    const utmParam = params.find(
      (p) => typeof p === "string" && p.includes("github"),
    );
    expect(utmParam).toBe(
      JSON.stringify({ source: "github", medium: "readme" }),
    );
  });

  it("stores null for utm when not provided", async () => {
    const client = makeMockClient();
    const adapter = postgres(client);
    const event: TrackrEvent = {
      type: "pageview",
      url: "/",
      ts: 1_700_000_000_000,
    };

    await adapter.save(event);

    const [, params] = client.query.mock.calls[0] as [string, unknown[]];
    // utm param position is index 9 (0-based): type,name,url,referrer,country,device,browser,os,sessionId,utm,props,ts
    expect(params[9]).toBeNull();
  });

  it("stores null for os when not detected", async () => {
    const client = makeMockClient();
    const adapter = postgres(client);
    const event: TrackrEvent = {
      type: "event",
      name: "click",
      url: "/",
      ts: 1_700_000_000_000,
    };

    await adapter.save(event);

    const [, params] = client.query.mock.calls[0] as [string, unknown[]];
    // os param position is index 7
    expect(params[7]).toBeNull();
  });
});
