import type { StorageAdapter, TrackrEvent } from "../types.js";

/**
 * Combines multiple StorageAdapters into one.
 * All adapters receive every event concurrently via Promise.all.
 *
 * Usage:
 *   import { multi } from "@casoon/trackr/storage/multi";
 *   import { postgres } from "@casoon/trackr/storage/postgres";
 *   import { ga4 } from "@casoon/trackr/storage/ga4";
 *
 *   const handler = createHandler({
 *     storage: multi(
 *       postgres(process.env.DATABASE_URL),
 *       ga4({ measurementId: "G-XXXXXXXXXX", apiSecret: "..." }),
 *     ),
 *   });
 */
export function multi(...adapters: StorageAdapter[]): StorageAdapter {
  return {
    async save(event: TrackrEvent): Promise<void> {
      await Promise.all(adapters.map((a) => a.save(event)));
    },
  };
}
