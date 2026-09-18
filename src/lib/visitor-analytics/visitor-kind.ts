import type { VisitorKind, VisitorSession } from "@/types/visitor-analytics";

const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|phantom|selenium|puppeteer|playwright|wget|curl|httpclient|python-requests|scrapy|uptimerobot|pingdom|statuscake|monitor|lighthouse|pagespeed|gtmetrix|semrush|ahrefs|mj12|dotbot|yandex|googlebot|bingbot|baidu|duckduck|applebot|chatgpt|gptbot|claudebot|anthropic|bytespider|petalbot|ia_archiver|archive\.org|facebookbot|twitterbot|linkedinbot|embedly|quora link|rogerbot|showyoubot|outbrain|pinterest|slackbot|vkshare|w3c_validator|whatsapp|telegrambot/i;

/** Classify from raw User-Agent string. */
export function detectVisitorKindFromUa(userAgent?: string | null): VisitorKind {
  const ua = (userAgent ?? "").trim();
  if (!ua) return "human";
  if (BOT_UA_PATTERN.test(ua)) return "bot";
  return "human";
}

/**
 * Resolve human vs bot for a session.
 * Prefers stored `visitorKind`, then UA, then light heuristics for older docs.
 */
export function resolveVisitorKind(session: VisitorSession): VisitorKind {
  if (session.visitorKind === "bot" || session.visitorKind === "human") {
    return session.visitorKind;
  }

  if (session.userAgent) {
    return detectVisitorKindFromUa(session.userAgent);
  }

  const label = `${session.deviceName || ""} ${session.browser || ""}`.toLowerCase();
  if (BOT_UA_PATTERN.test(label)) return "bot";

  // Legacy docs: unknown browser + zero interaction + instant bounce ≈ automated hit
  if (
    session.browser === "Other" &&
    session.clickCount === 0 &&
    session.searchCount === 0 &&
    session.pageViewCount <= 1 &&
    (session.durationSec || 0) < 3
  ) {
    return "bot";
  }

  return "human";
}

export function isBotSession(session: VisitorSession): boolean {
  return resolveVisitorKind(session) === "bot";
}
