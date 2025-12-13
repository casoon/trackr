import type { StorageAdapter, TrackrEvent } from "../types.js";

interface ApiConfig {
  url: string;
  headers?: Record<string, string>;
  transform?: (event: TrackrEvent) => unknown;
}

export function api(config: ApiConfig): StorageAdapter {
  return {
    async save(event: TrackrEvent): Promise<void> {
      const body = config.transform ? config.transform(event) : event;
      
      await fetch(config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...config.headers
        },
        body: JSON.stringify(body)
      });
    }
  };
}
