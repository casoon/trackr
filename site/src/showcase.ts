import type { ShowcaseExample } from '@casoon/pages-theme/showcase';

// Everything shown here is output of @casoon/trackr itself, captured by examples/capture.mjs
// (`pnpm build && node examples/capture.mjs` in the repository root) from the requests in
// examples/requests.json. The site does not run trackr: it ships no script beyond the
// theme's own two and sends no analytics.
const raw = import.meta.glob<string>(['../../examples/requests.json', '../../examples/output/*.json'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

function file(path: string): string {
  const content = raw[`../../${path}`];
  if (content === undefined) throw new Error(`Missing fixture: ${path}`);
  return content;
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const json = (value: unknown) => JSON.stringify(value, null, 2);

type Fixture = { url?: string; headers: Record<string, string>; body?: unknown };
const requests = JSON.parse(file('examples/requests.json')) as Record<string, Fixture>;

/** Escaped JSON of one captured output file, for a terminal panel. */
export const output = (name: string) => escapeHtml(file(`examples/output/${name}.json`).trimEnd());

/** The request fixture, as JSON. */
export const request = (name: string) => json(requests[name]);

export const clientSize = JSON.parse(file('examples/output/client-size.json')) as {
  file: string;
  bytes: number;
  gzip: number;
};

const terminal = (name: string) => ({ html: output(name), kind: 'terminal' as const });

export const examples: ShowcaseExample[] = [
  {
    slug: 'pageview',
    title: 'Pageview through createHandler',
    description:
      'A pageview as the browser script sends it, with UTM parameters and an email address in the query string, posted to createHandler() with anonymizeIp, stripPii and botFilter enabled. The handler drops the email parameter, adds a daily session ID and detects device, browser and OS from the User-Agent. The IP address is used for the session hash and not stored.',
    file: 'examples/output/pageview.json',
    tags: ['createHandler', 'stripPii', 'utm', 'sessionId'],
    input: { code: request('pageview'), lang: 'json' },
    output: terminal('pageview'),
  },
  {
    slug: 'custom-event',
    title: 'Custom event with personal data',
    description:
      'A track() call whose path and properties contain an email address. Properties with a PII key name are replaced by [redacted], email addresses inside string values and URL paths are redacted, numbers stay as they are.',
    file: 'examples/output/event.json',
    tags: ['track', 'sanitizeProps', 'stripPii'],
    input: { code: request('event'), lang: 'json' },
    output: terminal('event'),
  },
  {
    slug: 'bot-filter',
    title: 'Crawler request',
    description:
      'With botFilter: true a request whose User-Agent matches a crawler pattern, or that has no Accept-Language header, is answered with 200 OK and nothing is stored.',
    file: 'examples/output/bot.json',
    tags: ['botFilter', 'isBot'],
    input: { code: request('bot'), lang: 'json' },
    output: terminal('bot'),
  },
  {
    slug: 'pixel',
    title: 'Tracking pixel',
    description:
      'createPixelHandler() reads url and ref from the query string, records a pageview and always answers with a transparent GIF that must not be cached. Device, browser and OS are not detected on this path.',
    file: 'examples/output/pixel.json',
    tags: ['createPixelHandler', 'no JavaScript'],
    input: { code: request('pixel'), lang: 'json' },
    output: terminal('pixel'),
  },
  {
    slug: 'webhook',
    title: 'Webhook adapter',
    description:
      'The stored pageview from the first example, posted by the webhook adapter. With a secret, the body is signed with HMAC-SHA256 and the hex digest goes into X-Trackr-Signature.',
    file: 'examples/output/webhook.json',
    tags: ['storage/webhook', 'HMAC-SHA256'],
    input: {
      code: `webhook({
  url: "https://api.example.com/events",
  secret: "example-secret",
}).save(storedPageview);`,
      lang: 'ts',
    },
    output: terminal('webhook'),
  },
  {
    slug: 'ga4',
    title: 'GA4 Measurement Protocol',
    description:
      'The same pageview as the GA4 adapter sends it from the server: page_view with the session ID as client_id and non_personalized_ads set by default. Measurement ID and secret are placeholders; the capture answers the request locally.',
    file: 'examples/output/ga4.json',
    tags: ['storage/ga4', 'server-side'],
    input: {
      code: `ga4({
  measurementId: "G-XXXXXXXXXX",
  apiSecret: "example-secret",
}).save(storedPageview);`,
      lang: 'ts',
    },
    output: terminal('ga4'),
  },
  {
    slug: 'postgres',
    title: 'Postgres insert',
    description:
      'The query the Postgres adapter runs for the same pageview, recorded by a client stub. Columns match migrations/001_create_trackr_events.sql; utm and props are written as JSON.',
    file: 'examples/output/postgres.json',
    tags: ['storage/postgres', 'trackr_events'],
    input: { code: 'postgres(client).save(storedPageview);', lang: 'ts' },
    output: terminal('postgres'),
  },
];
