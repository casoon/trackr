import type { PrivacyConfig, TrackrEvent } from "../types.js";

/** Default privacy config — all protections ON. */
export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  anonymizeIp: true,
  stripPii: true,
};

/** Merge caller config with safe defaults. */
export function resolvePrivacyConfig(config?: PrivacyConfig): PrivacyConfig {
  return { ...DEFAULT_PRIVACY_CONFIG, ...config };
}

/** Regex patterns that identify PII-bearing parameter/key names. */
const PII_KEY_PATTERNS: RegExp[] = [
  /^e?mail$/i,
  /^phone$/i,
  /^(first|last|full|user|display)[_-]?name$/i,
  /^name$/i,
  /^(token|key|password|passwd|pass|secret|api[_-]?key)$/i,
  /^(address|street|city|zip|postal[_-]?code)$/i,
  /^(user[_-]?id|uid|login|username|user)$/i,
  /^(ssn|social|tax[_-]?id|national[_-]?id)$/i,
  /^(credit[_-]?card|card[_-]?number|cvv|ccn?)$/i,
  /^(ip[_-]?address)$/i,
  /^(dob|date[_-]?of[_-]?birth|birthday)$/i,
];

function isPiiKey(key: string): boolean {
  return PII_KEY_PATTERNS.some((p) => p.test(key));
}

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function anonymizeIp(ip: string): string {
  if (ip.includes(".")) {
    return `${ip.split(".").slice(0, 3).join(".")}.0`;
  }
  return `${ip.split(":").slice(0, 4).join(":")}::`;
}

export function stripPii(url: string): string {
  try {
    const u = new URL(url, "http://localhost");

    // Remove query params whose key matches a PII pattern
    const keysToDelete = [...u.searchParams.keys()].filter(isPiiKey);
    for (const k of keysToDelete) {
      u.searchParams.delete(k);
    }

    // Redact email patterns embedded in URL path segments
    const pathname = u.pathname.replace(EMAIL_PATTERN, "[redacted]");

    return pathname + (u.search || "");
  } catch {
    return url;
  }
}

export async function createSessionId(
  ip: string,
  ua: string,
  date: string,
): Promise<string> {
  const input = `${anonymizeIp(ip)}|${ua}|${date}`;
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export function sanitizeProps(
  props: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (isPiiKey(key)) {
      result[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string") {
      result[key] = value.replace(EMAIL_PATTERN, "[redacted]");
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function applyPrivacy(
  event: TrackrEvent,
  config: PrivacyConfig,
): TrackrEvent {
  const result = { ...event };

  if (config.stripPii && result.url) {
    result.url = stripPii(result.url);
  }

  if (config.stripPii && result.props) {
    result.props = sanitizeProps(result.props);
  }

  if (config.stripQueryParams && result.url) {
    try {
      const u = new URL(result.url, "http://localhost");
      for (const p of config.stripQueryParams) {
        if (p.endsWith("*")) {
          const prefix = p.slice(0, -1);
          const keysToDelete = [...u.searchParams.keys()].filter((k) =>
            k.startsWith(prefix),
          );
          for (const k of keysToDelete) {
            u.searchParams.delete(k);
          }
        } else {
          u.searchParams.delete(p);
        }
      }
      result.url = u.pathname + (u.search || "");
    } catch {}
  }

  return result;
}
