const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /crawling/i,
  /headless/i,
  /phantom/i,
  /selenium/i,
  /google/i,
  /bing/i,
  /yahoo/i,
  /baidu/i,
  /facebook/i,
  /twitter/i,
  /linkedin/i,
  /slack/i,
  /discord/i,
  /telegram/i,
  /preview/i,
  /curl/i,
  /wget/i,
  /monitoring/i,
  /uptime/i,
  /pingdom/i,
];

export function isBot(request: Request): boolean {
  const ua = request.headers.get("user-agent") || "";

  if (BOT_PATTERNS.some((p) => p.test(ua))) return true;
  if (!request.headers.get("accept-language")) return true;
  if (ua.length < 20) return true;

  return false;
}
