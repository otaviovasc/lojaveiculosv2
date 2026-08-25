import type { SessionBootstrap } from "./apiClient";
import { persistCurrentStoreSlug } from "./currentStore";
import { readSessionActiveStore } from "./sessionPermissions";

export function switchStoreWorkspace(
  session: SessionBootstrap,
  storeSlug: string,
  reload: () => void = () => window.location.reload(),
) {
  if (!selectStoreWorkspace(session, storeSlug)) return false;
  reload();
  return true;
}

export function selectStoreWorkspace(
  session: SessionBootstrap,
  storeSlug: string,
) {
  const nextStore = readAccessibleStoreWorkspace(session, storeSlug);
  if (!nextStore) return false;

  const currentStore = readSessionActiveStore(session);
  if (currentStore?.storeSlug === nextStore.storeSlug) return false;

  persistCurrentStoreSlug(nextStore.storeSlug, session.user.clerkUserId);
  return true;
}

export function readAccessibleStoreWorkspace(
  session: SessionBootstrap,
  storeSlug: string,
) {
  const { accessibleStores } = readAccessibleStoreWorkspaces(session);
  return (
    accessibleStores.find((store) => store.storeSlug === storeSlug) ?? null
  );
}

export function readStoreWorkspaceState(session: SessionBootstrap | null) {
  const activeStore = readSessionActiveStore(session);
  const { accessibleStores, activeAgencyMembership } =
    readAccessibleStoreWorkspaces(session);

  return {
    activeStore,
    agencyPortalHref: activeAgencyMembership ? "/agency/admin" : undefined,
    workspaces: accessibleStores.map((store) => ({
      id: store.storeSlug,
      meta: store.tenantName,
      name: store.storeName,
    })),
  };
}

function readAccessibleStoreWorkspaces(session: SessionBootstrap | null) {
  const activeStore = readSessionActiveStore(session);
  const activeAgencyMembership = session?.tenantMemberships.find(
    (membership) =>
      membership.status === "active" &&
      membership.role === "agency" &&
      membership.tenantId === activeStore?.tenantId,
  );
  const stores = [
    ...(session?.defaultStore ? [session.defaultStore] : []),
    ...(session?.stores ?? []),
  ];
  const accessibleStores = Array.from(
    new Map(
      stores
        .filter((store) => store.status === "active")
        .filter(
          (store) =>
            !activeAgencyMembership ||
            store.tenantId === activeAgencyMembership.tenantId,
        )
        .map((store) => [store.storeSlug, store]),
    ).values(),
  );

  return { accessibleStores, activeAgencyMembership };
}
