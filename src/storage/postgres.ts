import type { StorageAdapter, TrackrEvent, QueryOptions } from "../types.js";

interface PostgresClient {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
}

export function postgres(connectionStringOrClient: string | PostgresClient): StorageAdapter {
  let client: PostgresClient | null = null;
  
  const getClient = async (): Promise<PostgresClient> => {
    if (client) return client;
    
    if (typeof connectionStringOrClient === "string") {
      const pg = await import("pg");
      const pool = new pg.default.Pool({ connectionString: connectionStringOrClient });
      client = pool;
      return pool;
    }
    
    client = connectionStringOrClient;
    return client;
  };
  
  return {
    async save(event: TrackrEvent): Promise<void> {
      const db = await getClient();
      await db.query(
        `INSERT INTO trackr_events (type, name, url, referrer_domain, country, device, browser, session_id, props, ts)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10 / 1000.0))`,
        [
          event.type,
          event.name || null,
          event.url,
          event.referrer || null,
          event.country || null,
          event.device || null,
          event.browser || null,
          event.sessionId || null,
          JSON.stringify(event.props || {}),
          event.ts
        ]
      );
    },
    
    async query(options: QueryOptions): Promise<TrackrEvent[]> {
      const db = await getClient();
      const conditions: string[] = [];
      const values: unknown[] = [];
      let i = 1;
      
      if (options.from) {
        conditions.push(`ts >= $${i++}`);
        values.push(options.from);
      }
      if (options.to) {
        conditions.push(`ts <= $${i++}`);
        values.push(options.to);
      }
      if (options.type) {
        conditions.push(`type = $${i++}`);
        values.push(options.type);
      }
      
      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const limit = options.limit ? `LIMIT ${options.limit}` : "";
      
      const result = await db.query(
        `SELECT * FROM trackr_events ${where} ORDER BY ts DESC ${limit}`,
        values
      );
      
      return result.rows as TrackrEvent[];
    }
  };
}
