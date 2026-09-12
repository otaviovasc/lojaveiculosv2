import type { BillingOverview } from "./types";

export function readOrCreatePlanIdempotencyKey(
  overview: BillingOverview,
  planId: string,
  fallback: Map<string, string>,
) {
  const storageKey = planIdempotencyStorageKey(overview, planId);
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored) {
      fallback.set(storageKey, stored);
      return stored;
    }
    const fallbackKey = fallback.get(storageKey);
    if (fallbackKey) return fallbackKey;
    const created = createIdempotencyKey(planId);
    window.sessionStorage.setItem(storageKey, created);
    fallback.set(storageKey, created);
    return created;
  } catch {
    const stored = fallback.get(storageKey);
    if (stored) return stored;
    const created = createIdempotencyKey(planId);
    fallback.set(storageKey, created);
    return created;
  }
}

export function clearPlanIdempotencyKey(
  overview: BillingOverview,
  planId: string,
  fallback: Map<string, string>,
) {
  const storageKey = planIdempotencyStorageKey(overview, planId);
  fallback.delete(storageKey);
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
}

function planIdempotencyStorageKey(overview: BillingOverview, planId: string) {
  return `lojaveiculos.billing.plan-hire-idempotency.${overview.tenantId}.${overview.storeId}.${planId}`;
}

function createIdempotencyKey(planId: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `web-${planId}-${random}`;
}
