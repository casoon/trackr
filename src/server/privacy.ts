import type { PrivacyConfig, TrackrEvent } from "../types.js";

const PII_PARAMS = ["email", "mail", "phone", "name", "token", "key", "password", "secret"];

export function anonymizeIp(ip: string): string {
  if (ip.includes(".")) {
    return ip.split(".").slice(0, 3).join(".") + ".0";
  }
  return ip.split(":").slice(0, 4).join(":") + "::";
}

export function stripPii(url: string): string {
  try {
    const u = new URL(url, "http://localhost");
    PII_PARAMS.forEach(p => u.searchParams.delete(p));
    return u.pathname + (u.search || "");
  } catch {
    return url;
  }
}

export function createSessionId(ip: string, ua: string, date: string): string {
  const input = anonymizeIp(ip) + "|" + ua + "|" + date;
  return simpleHash(input).slice(0, 16);
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function applyPrivacy(
  event: TrackrEvent,
  config: PrivacyConfig
): TrackrEvent {
  const result = { ...event };

  if (config.stripPii && result.url) {
    result.url = stripPii(result.url);
  }

  if (config.stripQueryParams && result.url) {
    try {
      const u = new URL(result.url, "http://localhost");
      config.stripQueryParams.forEach(p => {
        if (p.endsWith("*")) {
          const prefix = p.slice(0, -1);
          [...u.searchParams.keys()]
            .filter(k => k.startsWith(prefix))
            .forEach(k => u.searchParams.delete(k));
        } else {
          u.searchParams.delete(p);
        }
      });
      result.url = u.pathname + (u.search || "");
    } catch {}
  }

  return result;
}
