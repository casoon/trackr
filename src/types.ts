export interface TrackrEvent {
  type: "pageview" | "event";
  name?: string;
  url: string;
  referrer?: string;
  country?: string;
  device?: "desktop" | "mobile" | "tablet";
  browser?: string;
  sessionId?: string;
  props?: Record<string, string | number | boolean>;
  ts: number;
}

export interface TrackrConfig {
  endpoint: string;
  debug?: boolean;
}

export interface StorageAdapter {
  save(event: TrackrEvent): Promise<void>;
  query?(options: QueryOptions): Promise<TrackrEvent[]>;
}

export interface QueryOptions {
  from?: Date;
  to?: Date;
  type?: "pageview" | "event";
  limit?: number;
}

export interface PrivacyConfig {
  anonymizeIp?: boolean;
  stripPii?: boolean;
  stripQueryParams?: string[];
}

export interface HandlerConfig {
  storage: StorageAdapter;
  privacy?: PrivacyConfig;
  botFilter?: boolean;
}
