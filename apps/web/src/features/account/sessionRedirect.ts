import type { SessionBootstrap } from "./apiClient";

export type SessionDestination =
  "/dashboard" | "/agency/admin" | "/onboarding" | "/platform/observability";

export function resolveSessionDestination(
  bootstrap: SessionBootstrap,
): SessionDestination | null {
  if (bootstrap.needsOnboarding) return "/onboarding";
  if (bootstrap.platformAdmin) return "/platform/observability";
  if (bootstrap.defaultStore) return "/dashboard";
  if (hasActiveAgencyMembership(bootstrap)) {
    return "/agency/admin";
  }
  if (bootstrap.stores.some((store) => store.status === "active")) {
    return "/dashboard";
  }
  return null;
}

export function hasActiveAgencyMembership(bootstrap: SessionBootstrap) {
  return bootstrap.tenantMemberships.some(
    (membership) =>
      membership.role === "agency" && membership.status === "active",
  );
}
