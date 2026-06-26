import { parseDevice } from "@/lib/visitor-analytics/format";

export const VISITOR_ID_KEY = "ss_visitor_id";
export const DEVICE_ID_KEY = "ss_device_id";
export const LEGACY_GUEST_ID_KEY = "safar-sathi-ai-guest-id";

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // private browsing
  }
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 11);
}

/** Persistent visitor ID — shared by site analytics and AI assistant. */
export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";

  let id = safeGet(VISITOR_ID_KEY);
  if (!id) {
    const legacyGuest = safeGet(LEGACY_GUEST_ID_KEY);
    id =
      legacyGuest && (legacyGuest.startsWith("v_") || legacyGuest.startsWith("guest_"))
        ? legacyGuest.startsWith("v_")
          ? legacyGuest
          : `v_${legacyGuest.slice(6)}`
        : `v_${Date.now()}_${randomSuffix()}`;
    safeSet(VISITOR_ID_KEY, id);
  }

  safeSet(LEGACY_GUEST_ID_KEY, id);
  return id;
}

/** AI assistant uses the same ID as visitor analytics. */
export function getOrCreateGuestId(): string {
  return getOrCreateVisitorId();
}

/** Stable device ID for grouping return visits on the same browser. */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";

  let id = safeGet(DEVICE_ID_KEY);
  if (!id) {
    id = `d_${Date.now()}_${randomSuffix()}`;
    safeSet(DEVICE_ID_KEY, id);
  }
  return id;
}

export function detectDeviceName(userAgent?: string): string {
  if (typeof window === "undefined" && !userAgent) return "Unknown device";

  const ua = userAgent ?? navigator.userAgent;
  const { device, browser } = parseDevice(ua);

  let os = "Unknown OS";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/mac os x/i.test(ua) && !/iphone|ipad|ipod/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone/i.test(ua)) os = "iPhone";
  else if (/ipad/i.test(ua)) os = "iPad";
  else if (/linux/i.test(ua)) os = "Linux";

  const screen =
    typeof window !== "undefined"
      ? `${window.screen.width}×${window.screen.height}`
      : undefined;

  return screen ? `${browser} · ${os} · ${device} (${screen})` : `${browser} · ${os} · ${device}`;
}

export function shortVisitorLabel(visitorId: string): string {
  const tail = visitorId.replace(/^(v_|guest_)/, "").slice(-8) || visitorId.slice(-6);
  return `Visitor …${tail}`;
}

export function shortDeviceLabel(deviceId?: string): string {
  if (!deviceId) return "";
  const tail = deviceId.replace(/^d_/, "").slice(-8) || deviceId.slice(-6);
  return `Device …${tail}`;
}
