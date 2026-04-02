import { describe, expect, it, vi } from "vitest";
import { multi } from "../src/storage/multi.js";
import type { StorageAdapter, TrackrEvent } from "../src/types.js";

const mockEvent: TrackrEvent = {
  type: "pageview",
  url: "/test",
  ts: 1000000,
};

function mockAdapter(): StorageAdapter & { saved: TrackrEvent[] } {
  const saved: TrackrEvent[] = [];
  return {
    saved,
    async save(event) {
      saved.push(event);
    },
  };
}

describe("multi adapter", () => {
  it("forwards event to all adapters", async () => {
    const a = mockAdapter();
    const b = mockAdapter();
    const adapter = multi(a, b);

    await adapter.save(mockEvent);

    expect(a.saved).toHaveLength(1);
    expect(b.saved).toHaveLength(1);
    expect(a.saved[0]).toEqual(mockEvent);
    expect(b.saved[0]).toEqual(mockEvent);
  });

  it("calls adapters concurrently (Promise.all)", async () => {
    const order: string[] = [];
    const slow: StorageAdapter = {
      save: () =>
        new Promise((resolve) =>
          setTimeout(() => {
            order.push("slow");
            resolve();
          }, 10),
        ),
    };
    const fast: StorageAdapter = {
      save: async () => {
        order.push("fast");
      },
    };

    await multi(slow, fast).save(mockEvent);
    // With Promise.all, fast resolves before slow regardless of declaration order
    expect(order).toEqual(["fast", "slow"]);
  });

  it("rejects if any adapter fails", async () => {
    const failing: StorageAdapter = {
      save: async () => {
        throw new Error("DB down");
      },
    };
    const ok = mockAdapter();
    await expect(multi(failing, ok).save(mockEvent)).rejects.toThrow("DB down");
  });

  it("works with a single adapter", async () => {
    const a = mockAdapter();
    await multi(a).save(mockEvent);
    expect(a.saved).toHaveLength(1);
  });

  it("works with zero adapters", async () => {
    await expect(multi().save(mockEvent)).resolves.toBeUndefined();
  });
});
