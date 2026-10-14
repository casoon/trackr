// Captures what @casoon/trackr does with the requests in examples/requests.json and writes
// the results to examples/output/, where the project site (site/src/showcase.ts) reads them.
//
//   pnpm build && node examples/capture.mjs
//
// Runs the built package from dist/. Outgoing HTTP calls (webhook, GA4) are answered by a
// stub fetch that records the request instead of sending it; the Postgres adapter gets a
// client that records the query. The clock is fixed to 2026-10-14T07:00:00Z so the daily
// session ID is reproducible.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createHandler } from "../dist/server/index.js";
import { createPixelHandler } from "../dist/server/pixel.js";
import { ga4 } from "../dist/storage/ga4.js";
import { postgres } from "../dist/storage/postgres.js";
import { webhook } from "../dist/storage/webhook.js";

const root = new URL("../", import.meta.url);
const out = new URL("examples/output/", root);
mkdirSync(out, { recursive: true });

const FIXED_NOW = Date.parse("2026-10-14T07:00:00Z");
const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [FIXED_NOW]));
  }
  static now() {
    return FIXED_NOW;
  }
};

const requests = JSON.parse(
  readFileSync(new URL("examples/requests.json", root), "utf8"),
);

function write(name, data) {
  writeFileSync(new URL(name, out), `${JSON.stringify(data, null, 2)}\n`);
}

function recorder() {
  const saved = [];
  return {
    saved,
    storage: {
      async save(event) {
        saved.push(event);
      },
    },
  };
}

function post(fixture) {
  return new Request("https://example.com/api/track", {
    method: "POST",
    headers: fixture.headers,
    body: JSON.stringify(fixture.body),
  });
}

const handlerConfig = {
  privacy: { anonymizeIp: true, stripPii: true },
  botFilter: true,
};

// 1–3: createHandler with a pageview, a custom event and a crawler.
for (const name of ["pageview", "event", "bot"]) {
  const { saved, storage } = recorder();
  const handler = createHandler({ ...handlerConfig, storage });
  const res = await handler(post(requests[name]));
  write(`${name}.json`, {
    response: { status: res.status, body: await res.text() },
    stored: saved,
  });
}

// 4: pixel handler.
{
  const { saved, storage } = recorder();
  const pixel = createPixelHandler({ ...handlerConfig, storage });
  const res = await pixel(
    new Request(requests.pixel.url, { headers: requests.pixel.headers }),
  );
  const bytes = new Uint8Array(await res.arrayBuffer());
  write("pixel.json", {
    response: {
      status: res.status,
      headers: Object.fromEntries(res.headers),
      bytes: bytes.length,
    },
    stored: saved,
  });
}

// The pageview as the server stored it; the adapters below receive this event.
const {
  stored: [storedPageview],
} = JSON.parse(readFileSync(new URL("pageview.json", out), "utf8"));

const sent = [];
globalThis.fetch = async (url, init) => {
  sent.push({
    url: String(url),
    method: init.method,
    headers: init.headers,
    body: JSON.parse(init.body),
  });
  return new Response(null, { status: 204 });
};

// 5: webhook adapter with a signing secret.
await webhook({
  url: "https://api.example.com/events",
  secret: "example-secret",
}).save(storedPageview);
write("webhook.json", sent.splice(0));

// 6: GA4 Measurement Protocol adapter (placeholder ID and secret, nothing leaves the machine).
await ga4({
  measurementId: "G-XXXXXXXXXX",
  apiSecret: "example-secret",
}).save(storedPageview);
write("ga4.json", sent.splice(0));

// 7: Postgres adapter with a recording client.
{
  const queries = [];
  await postgres({
    async query(text, values) {
      queries.push({ text: text.replace(/\s+/g, " ").trim(), values });
      return { rows: [] };
    },
  }).save(storedPageview);
  write("postgres.json", queries);
}

// 8: size of the browser script shipped in the package.
{
  const script = readFileSync(new URL("script.js", root));
  write("client-size.json", {
    file: "script.js",
    bytes: script.length,
    gzip: gzipSync(script).length,
  });
}

console.log(`wrote examples/output/ (${new RealDate().toISOString()})`);
