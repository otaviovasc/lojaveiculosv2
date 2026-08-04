// Last successfully loaded scoped-section data per API instance, so WhatsApp
// inbox tabs mounted after an idle prefetch render immediately instead of
// flashing their loading state. Keyed by API instance (WeakMap) to preserve
// tenant/store isolation and to let tests stay independent.
const scopedCaches = new WeakMap<object, Map<string, unknown>>();

export const WHATSAPP_CAMPAIGNS_CACHE_KEY = "campaigns";
export const WHATSAPP_BOT_INTEGRATION_CACHE_KEY = "botIntegration";
export const WHATSAPP_VISITS_CACHE_KEY = "visits";

export function whatsappScheduledMessagesCacheKey(
  connectionId: string | number | null,
) {
  return `scheduledMessages:${connectionId ?? "default"}`;
}

export function peekWhatsappScopedCache<T>(
  owner: object,
  key: string,
): T | undefined {
  return scopedCaches.get(owner)?.get(key) as T | undefined;
}

export function writeWhatsappScopedCache<T>(
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
export function prefetchWhatsappScopedData<T>(
  owner: object,
  key: string,
  load: () => Promise<T>,
): void {
  if (peekWhatsappScopedCache(owner, key) !== undefined) return;
  void load().then(
    (value) => writeWhatsappScopedCache(owner, key, value),
    () => {},
  );
}
