import type { StorageAdapter, TrackrEvent } from "../types.js";

export interface BatchOptions {
  /** Flush when buffer reaches this size (default: 10) */
  maxSize?: number;
  /** Flush after this many ms since first buffered event (default: 5000) */
  maxWait?: number;
  /** Called when a flush fails */
  onError?: (error: unknown, events: TrackrEvent[]) => void;
}

export interface BatchedAdapter extends StorageAdapter {
  /** Manually flush all buffered events */
  flush(): Promise<void>;
  /** Number of currently buffered events */
  readonly pending: number;
}

export function batch(
  adapter: StorageAdapter,
  options?: BatchOptions,
): BatchedAdapter {
  const maxSize = options?.maxSize ?? 10;
  const maxWait = options?.maxWait ?? 5000;
  const onError = options?.onError;

  let buffer: TrackrEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function flush(): Promise<void> {
    if (buffer.length === 0) return;

    const events = buffer;
    buffer = [];

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    try {
      if (adapter.saveBatch) {
        await adapter.saveBatch(events);
      } else {
        await Promise.all(events.map((e) => adapter.save(e)));
      }
    } catch (err) {
      if (onError) {
        onError(err, events);
      } else {
        throw err;
      }
    }
  }

  function scheduleFlush(): void {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      flush().catch((err) => {
        if (onError) onError(err, []);
      });
    }, maxWait);
  }

  return {
    async save(event: TrackrEvent): Promise<void> {
      buffer.push(event);
      if (buffer.length >= maxSize) {
        await flush();
      } else {
        scheduleFlush();
      }
    },

    flush,

    get pending(): number {
      return buffer.length;
    },
  };
}
