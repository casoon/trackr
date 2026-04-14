import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webhook } from "../src/storage/webhook.js";
import type { TrackrEvent } from "../src/types.js";

const mockEvent: TrackrEvent = {
  type: "pageview",
  url: "/test",
  ts: 1000000,
};

const WEBHOOK_URL = "https://example.com/hook";

describe("webhook adapter", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, statusText: "OK" }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends event via POST with JSON content type", async () => {
    const adapter = webhook({ url: WEBHOOK_URL });
    await adapter.save(mockEvent);

    expect(fetch).toHaveBeenCalledWith(WEBHOOK_URL, {
      method: "POST",
      headers: expect.objectContaining({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(mockEvent),
    });
  });

  it("includes custom headers", async () => {
    const adapter = webhook({
      url: WEBHOOK_URL,
      headers: { Authorization: "Bearer token123" },
    });
    await adapter.save(mockEvent);

    const call = vi.mocked(fetch).mock.calls[0];
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token123");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("signs payload with HMAC-SHA256 when secret is set", async () => {
    const secret = "my-webhook-secret";
    const adapter = webhook({ url: WEBHOOK_URL, secret });
    await adapter.save(mockEvent);

    const call = vi.mocked(fetch).mock.calls[0];
    const headers = call[1]?.headers as Record<string, string>;
    const body = call[1]?.body as string;
    const expectedSig = createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    expect(headers["X-Trackr-Signature"]).toBe(expectedSig);
  });

  it("does not include signature header without secret", async () => {
    const adapter = webhook({ url: WEBHOOK_URL });
    await adapter.save(mockEvent);

    const call = vi.mocked(fetch).mock.calls[0];
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["X-Trackr-Signature"]).toBeUndefined();
  });

  it("applies transform before sending", async () => {
    const adapter = webhook({
      url: WEBHOOK_URL,
      transform: (e) => ({ page: e.url, time: e.ts }),
    });
    await adapter.save(mockEvent);

    const call = vi.mocked(fetch).mock.calls[0];
    expect(call[1]?.body).toBe(JSON.stringify({ page: "/test", time: 1000000 }));
  });

  it("throws on non-OK response without retry", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
    } as Response);

    const adapter = webhook({ url: WEBHOOK_URL });
    await expect(adapter.save(mockEvent)).rejects.toThrow("Webhook failed: 400 Bad Request");
  });

  it("retries on 5xx errors", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
      } as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, statusText: "OK" } as Response);

    const adapter = webhook({
      url: WEBHOOK_URL,
      retry: { attempts: 2, baseDelay: 1 },
    });

    await adapter.save(mockEvent);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries", async () => {
    const failure = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response;
    vi.mocked(fetch)
      .mockResolvedValueOnce(failure)
      .mockResolvedValueOnce(failure);

    const adapter = webhook({
      url: WEBHOOK_URL,
      retry: { attempts: 1, baseDelay: 1 },
    });

    await expect(adapter.save(mockEvent)).rejects.toThrow("Webhook failed: 500");
  });

  it("does not retry on 4xx errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
    } as Response);

    const adapter = webhook({
      url: WEBHOOK_URL,
      retry: { attempts: 3, baseDelay: 1 },
    });

    await expect(adapter.save(mockEvent)).rejects.toThrow("Webhook failed: 422");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  describe("saveBatch", () => {
    it("sends array of events in single request", async () => {
      const events: TrackrEvent[] = [
        { type: "pageview", url: "/a", ts: 1 },
        { type: "event", url: "/b", name: "click", ts: 2 },
      ];

      const adapter = webhook({ url: WEBHOOK_URL });
      await adapter.saveBatch!(events);

      expect(fetch).toHaveBeenCalledTimes(1);
      const call = vi.mocked(fetch).mock.calls[0];
      expect(call[1]?.body).toBe(JSON.stringify(events));
    });

    it("signs batch payload", async () => {
      const secret = "batch-secret";
      const events: TrackrEvent[] = [mockEvent, mockEvent];

      const adapter = webhook({ url: WEBHOOK_URL, secret });
      await adapter.saveBatch!(events);

      const call = vi.mocked(fetch).mock.calls[0];
      const body = call[1]?.body as string;
      const headers = call[1]?.headers as Record<string, string>;
      const expected = createHmac("sha256", secret).update(body).digest("hex");
      expect(headers["X-Trackr-Signature"]).toBe(expected);
    });

    it("applies transform to each event in batch", async () => {
      const adapter = webhook({
        url: WEBHOOK_URL,
        transform: (e) => ({ p: e.url }),
      });

      await adapter.saveBatch!([mockEvent, { type: "event", url: "/other", ts: 2, name: "x" }]);

      const call = vi.mocked(fetch).mock.calls[0];
      expect(call[1]?.body).toBe(
        JSON.stringify([{ p: "/test" }, { p: "/other" }]),
      );
    });
  });
});
