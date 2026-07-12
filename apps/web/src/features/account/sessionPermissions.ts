import type { SessionBootstrap } from "./apiClient";
import { readRuntimeStoreSlug } from "./currentStore";

export function readSessionEffectivePermissions(
  session: SessionBootstrap | null,
): readonly string[] | undefined {
  if (!session) return undefined;
  const runtimeStoreSlug = readRuntimeStoreSlug(
    undefined,
    session.user.clerkUserId,
  );
  const activeStores = session.stores.filter(
    (store) => store.status === "active",
  );
  const store =
    activeStores.find((item) => item.storeSlug === runtimeStoreSlug) ??
    (session.defaultStore?.status === "active" ? session.defaultStore : null) ??
    activeStores[0] ??
    null;
  return store?.effectivePermissions;
}
