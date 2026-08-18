// Last successfully loaded scoped-section data per API instance, so WhatsApp
// inbox tabs mounted after an idle prefetch render immediately instead of
// flashing their loading state. Keyed by API instance (WeakMap) to preserve
// tenant/store isolation and to let tests stay independent.
const scopedCaches = new WeakMap<object, Map<string, unknown>>();

export const CRM_CAMPAIGNS_CACHE_KEY = "campaigns";
export const CRM_EXTERNAL_BOT_CACHE_KEY = "botIntegration";
export const CRM_VISITS_CACHE_KEY = "visits";

export function crmScheduledMessagesCacheKey(
  connectionId: string | number | null,
) {
  return `scheduledMessages:${connectionId ?? "default"}`;
}

export function peekCrmScopedCache<T>(
  owner: object,
  key: string,
): T | undefined {
  return scopedCaches.get(owner)?.get(key) as T | undefined;
}

export function writeCrmScopedCache<T>(
  owner: object,
  key: string,
  value: T,
): void {
  let byKey = scopedCaches.get(owner);
  if (!byKey) {
    byKey = new Map<string, unknown>();
    scopedCaches.set(owner, byKey);
  }
  byKey.set(key, value);
}

// Fire-and-forget warmer: skips when data is already cached and swallows
// errors (the section refetches on visit and surfaces its own error state).
export function prefetchCrmScopedData<T>(
  owner: object,
  key: string,
  load: () => Promise<T>,
): void {
  if (peekCrmScopedCache(owner, key) !== undefined) return;
  void load().then(
    (value) => writeCrmScopedCache(owner, key, value),
    () => {},
  );
}
