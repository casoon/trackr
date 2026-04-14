import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { batch } from "../src/storage/batch.js";
import type { StorageAdapter, TrackrEvent } from "../src/types.js";

const ev = (url: string): TrackrEvent => ({
  type: "pageview",
  url,
  ts: Date.now(),
});

function mockAdapter(): StorageAdapter & { saved: TrackrEvent[] } {
  const saved: TrackrEvent[] = [];
  return {
    saved,
    async save(event) {
      saved.push(event);
    },
  };
}

function mockBatchAdapter(): StorageAdapter & {
  batches: TrackrEvent[][];
  saved: TrackrEvent[];
} {
  const batches: TrackrEvent[][] = [];
  const saved: TrackrEvent[] = [];
  return {
    batches,
    saved,
    async save(event) {
      saved.push(event);
    },
    async saveBatch(events) {
      batches.push([...events]);
    },
  };
}

describe("batch adapter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("buffers events until maxSize is reached", async () => {
    const inner = mockAdapter();
    const batched = batch(inner, { maxSize: 3, maxWait: 60000 });

    await batched.save(ev("/a"));
    await batched.save(ev("/b"));
    expect(inner.saved).toHaveLength(0);
    expect(batched.pending).toBe(2);

    await batched.save(ev("/c"));
    expect(inner.saved).toHaveLength(3);
    expect(batched.pending).toBe(0);
  });

  it("flushes after maxWait timeout", async () => {
    const inner = mockAdapter();
    const batched = batch(inner, { maxSize: 100, maxWait: 2000 });

    await batched.save(ev("/a"));
    expect(inner.saved).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(2000);
    expect(inner.saved).toHaveLength(1);
  });

  it("uses saveBatch when available", async () => {
    const inner = mockBatchAdapter();
    const batched = batch(inner, { maxSize: 2, maxWait: 60000 });

    await batched.save(ev("/a"));
    await batched.save(ev("/b"));

    expect(inner.batches).toHaveLength(1);
    expect(inner.batches[0]).toHaveLength(2);
    expect(inner.saved).toHaveLength(0);
  });

  it("falls back to individual save() calls without saveBatch", async () => {
    const inner = mockAdapter();
    const batched = batch(inner, { maxSize: 2, maxWait: 60000 });

    await batched.save(ev("/a"));
    await batched.save(ev("/b"));

    expect(inner.saved).toHaveLength(2);
  });

  it("manual flush() empties buffer", async () => {
    const inner = mockAdapter();
    const batched = batch(inner, { maxSize: 100, maxWait: 60000 });

    await batched.save(ev("/a"));
    await batched.save(ev("/b"));
    expect(batched.pending).toBe(2);

    await batched.flush();
    expect(batched.pending).toBe(0);
    expect(inner.saved).toHaveLength(2);
  });

  it("flush() on empty buffer is a no-op", async () => {
    const inner = mockAdapter();
    const batched = batch(inner, { maxSize: 10 });

    await batched.flush();
    expect(inner.saved).toHaveLength(0);
  });

  it("calls onError when flush fails", async () => {
    const failing: StorageAdapter = {
      async save() {
        throw new Error("write failed");
      },
    };
    const errors: unknown[] = [];
    const batched = batch(failing, {
      maxSize: 1,
      onError: (err) => errors.push(err),
    });

    await batched.save(ev("/a"));

    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe("write failed");
  });

  it("throws on flush error without onError handler", async () => {
    const failing: StorageAdapter = {
      async save() {
        throw new Error("db down");
      },
    };
    const batched = batch(failing, { maxSize: 1 });

    await expect(batched.save(ev("/a"))).rejects.toThrow("db down");
  });

  it("resets timer after size-based flush", async () => {
    const inner = mockAdapter();
    const batched = batch(inner, { maxSize: 2, maxWait: 1000 });

    await batched.save(ev("/a"));
    await batched.save(ev("/b")); // triggers flush
    expect(inner.saved).toHaveLength(2);

    // timer should be cleared, no double-flush
    await vi.advanceTimersByTimeAsync(1000);
    expect(inner.saved).toHaveLength(2);
  });

  it("handles rapid successive events beyond maxSize", async () => {
    const inner = mockBatchAdapter();
    const batched = batch(inner, { maxSize: 2, maxWait: 60000 });

    await batched.save(ev("/1"));
    await batched.save(ev("/2")); // flush
    await batched.save(ev("/3"));
    await batched.save(ev("/4")); // flush

    expect(inner.batches).toHaveLength(2);
    expect(inner.batches[0]).toHaveLength(2);
    expect(inner.batches[1]).toHaveLength(2);
  });
});
