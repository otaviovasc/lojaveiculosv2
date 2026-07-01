import type { SessionBootstrap } from "./apiClient";

export type SessionDestination =
  "/dashboard" | "/agency/admin" | "/onboarding" | "/platform/admin";

export function resolveSessionDestination(
  bootstrap: SessionBootstrap,
): SessionDestination {
  if (bootstrap.needsOnboarding) return "/onboarding";
  if (bootstrap.platformAdmin) return "/platform/admin";
  if (bootstrap.defaultStore) return "/dashboard";
  if (hasActiveAgencyMembership(bootstrap)) {
    return "/agency/admin";
  }
  return "/onboarding";
}

export function hasActiveAgencyMembership(bootstrap: SessionBootstrap) {
  return bootstrap.tenantMemberships.some(
    (membership) =>
      membership.role === "agency" && membership.status === "active",
  );
}
