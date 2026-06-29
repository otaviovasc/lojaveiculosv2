import {
  generateEventId,
  getFbcCookie,
  getFbpCookie,
} from "@/lib/meta-pixel/events";
import {
  getSessionUtm,
  mergeFirstTouchAndSessionUtm,
  updateSessionUtm,
} from "@/lib/utm/session-utm";
import { mapActionToMetaEvent } from "@centroimovel/types";

const VISITOR_ID_KEY = "_ci_vid";
const SESSION_ID_KEY = "_ci_sid";
const FIRST_TOUCH_UTM_KEY = "_ci_ft_utm";
const SESSION_UTM_KEY = "_ci_s_utm";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

const CLICK_ID_KEYS = ["fbclid", "gclid", "ttclid"] as const;

const INTERNAL_KEYS = [
  ...UTM_KEYS,
  ...CLICK_ID_KEYS,
  "editor",
  "template",
  "_ci_vid",
] as const;

/* ─── Client Helpers ─────────────────────────────────────────────────── */

function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  const domain = window.location.hostname.includes(".")
    ? `; domain=.${window.location.hostname.split(".").slice(-2).join(".")}`
    : "";
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; samesite=lax${domain}`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? (match[2] as string) : null;
}

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";

  // 1. Try URL adoption
  const sp = new URLSearchParams(window.location.search);
  const adoptedId = sp.get("_ci_vid");
  if (adoptedId && adoptedId.length > 20) {
    setCookie(VISITOR_ID_KEY, adoptedId, COOKIE_MAX_AGE);
    localStorage.setItem(VISITOR_ID_KEY, adoptedId);
    return adoptedId;
  }

  // 2. Try cookie (shared with SSR)
  let id = getCookie(VISITOR_ID_KEY);

  // 3. Try legacy keys or localStorage
  if (!id) {
    id =
      localStorage.getItem(VISITOR_ID_KEY) ||
      localStorage.getItem("fi_visitor_id") ||
      localStorage.getItem("ci_visitor_id");
  }

  if (!id) {
    id = crypto.randomUUID();
  }

  // Sync back to both
  setCookie(VISITOR_ID_KEY, id, COOKIE_MAX_AGE);
  localStorage.setItem(VISITOR_ID_KEY, id);

  return id;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

/**
 * Get visitor ID from cookies in Server Components
 */
export async function getVisitorIdServer(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return cookieStore.get(VISITOR_ID_KEY)?.value || null;
  } catch {
    return null;
  }
}

/* ─── Attribution Persistence ────────────────────────────────────────── */

export function getFirstTouchUtmData(): Record<string, string> {
  try {
    const stored = localStorage.getItem(FIRST_TOUCH_UTM_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function getSessionUtmData(): Record<string, string> {
  const sessionData = getSessionUtm();
  if (!sessionData) return {};

  return {
    utm_source: sessionData.source ?? "",
    utm_medium: sessionData.medium ?? "",
    utm_campaign: sessionData.campaign ?? "",
    utm_term: sessionData.term ?? "",
    utm_content: sessionData.content ?? "",
  };
}

export function getMergedUtmData(): Record<string, string | null> {
  const firstTouch = getFirstTouchUtmData();
  return mergeFirstTouchAndSessionUtm(firstTouch);
}

function extractUtm(sp: URLSearchParams): Record<string, string> {
  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const val = sp.get(key);
    if (val) utm[key] = val;
  }
  for (const key of CLICK_ID_KEYS) {
    const val = sp.get(key);
    if (val) utm[key] = val;
  }
  return utm;
}

export function initTracker() {
  if (typeof window === "undefined") return;

  const sp = new URLSearchParams(window.location.search);
  const utm = extractUtm(sp);

  if (Object.keys(utm).length > 0) {
    if (!localStorage.getItem(FIRST_TOUCH_UTM_KEY)) {
      localStorage.setItem(FIRST_TOUCH_UTM_KEY, JSON.stringify(utm));
    }
  }

  updateSessionUtm(sp);

  getVisitorId();
}

/* ─── Event Tracking ─────────────────────────────────────────────────── */

function dispatchMetaPixelEvent(
  action: string,
  metadata?: Record<string, unknown>,
) {
  if (typeof window === "undefined" || !window.fbq) return;

  const pixelId = window.__META_PIXEL_ID;
  if (!pixelId) return;

  const metaEventName = mapActionToMetaEvent(action);
  if (!metaEventName) return;

  const eventId = generateEventId(metaEventName);
  const eventOptions = { eventID: eventId };

  switch (action) {
    case "form_submit":
      window.fbq(
        "track",
        "Lead",
        {
          content_name: metadata?.propertyTitle,
          content_category: "Real Estate",
          value: metadata?.price,
          currency: "BRL",
        },
        eventOptions,
      );
      break;
    case "get_property_view":
      window.fbq(
        "track",
        "ViewContent",
        {
          content_ids: [metadata?.propertyId],
          content_type: "product",
          content_name: metadata?.title,
        },
        eventOptions,
      );
      break;
    case "contact_click_whatsapp":
    case "contact_click_phone":
      window.fbq(
        "track",
        "Contact",
        {
          method: action.split("_").pop(),
          content_name: metadata?.propertyTitle,
        },
        eventOptions,
      );
      break;
    case "search_properties":
    case "get_property_listing":
      window.fbq(
        "track",
        "Search",
        {
          search_string: metadata?.query || metadata?.search,
        },
        eventOptions,
      );
      break;
    default:
      if (action === "page_view") {
        window.fbq("track", "PageView", {}, eventOptions);
      }
  }

  return eventId;
}

export function trackEvent(
  action: string,
  workspaceId: string,
  opts?: {
    resourceId?: string;
    metadata?: Record<string, unknown>;
    duration?: number;
    userId?: string | null;
  },
): string | undefined {
  if (typeof window === "undefined") return;

  const sp = new URLSearchParams(window.location.search);
  if (sp.get("editor") === "1") return;

  const currentUtm = extractUtm(sp);
  const sessionUtm = getSessionUtmData();
  const firstTouchUtm = getFirstTouchUtmData();

  const mergedUtm = {
    ...firstTouchUtm,
    ...sessionUtm,
    ...currentUtm,
  };

  const metaEventName = mapActionToMetaEvent(action);
  const eventId = metaEventName
    ? generateEventId(metaEventName)
    : crypto.randomUUID();

  const body = {
    action,
    workspaceId,
    eventId,
    resourceId: opts?.resourceId,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    userId: opts?.userId || null,
    path: window.location.pathname,
    referrer: document.referrer || null,
    utm: mergedUtm,
    fbp: getFbpCookie(),
    fbc: getFbcCookie(),
    metadata: opts?.metadata,
    duration: opts?.duration,
  };

  const pixelEventId = dispatchMetaPixelEvent(action, opts?.metadata);

  try {
    const payload = JSON.stringify(body);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/track",
        new Blob([payload], { type: "application/json" }),
      );
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}

  return pixelEventId || eventId;
}
