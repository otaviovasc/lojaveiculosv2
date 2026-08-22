export type CrmSurface = "leads" | "conversations";
export type CrmRouteState = {
  cycleId: string | null;
  scope: CrmRouteScope;
};
export type CrmRouteScope =
  | "campaigns"
  | "connection"
  | "conversations"
  | "integrations"
  | "schedules"
  | "statistics"
  | "tags"
  | "visits";

const crmScopes = new Set<CrmRouteScope>([
  "campaigns",
  "connection",
  "conversations",
  "integrations",
  "schedules",
  "statistics",
  "tags",
  "visits",
]);

const crmSurfaces = new Set<CrmSurface>(["leads", "conversations"]);

export function crmSurfaceHash(surface: CrmSurface) {
  return `/crm?surface=${surface}`;
}

export function crmConversationCycleHash(cycleId: string | number) {
  return `/crm?surface=conversations&cycleId=${encodeURIComponent(String(cycleId))}`;
}

export function crmScopeHash(scope: CrmRouteScope) {
  return `/crm?surface=conversations&scope=${scope}`;
}

export function readCrmScopeFromHash(
  hash: string,
  fallback: CrmRouteScope = "conversations",
) {
  const query = hash.split("?")[1] ?? "";
  const scope = new URLSearchParams(query).get("scope");
  return crmScopes.has(scope as CrmRouteScope)
    ? (scope as CrmRouteScope)
    : fallback;
}

export function readCrmConversationCycleIdFromHash(hash: string) {
  const query = hash.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  const cycleId = (params.get("cycleId") ?? params.get("crm_session"))?.trim();
  return cycleId || null;
}

export function readCrmRouteStateFromHash(hash: string): CrmRouteState {
  const scope = readCrmScopeFromHash(hash);
  return {
    cycleId:
      scope === "conversations"
        ? readCrmConversationCycleIdFromHash(hash)
        : null,
    scope,
  };
}

export function readCrmSurfaceFromHash(
  hash: string,
  fallback: CrmSurface = "conversations",
): CrmSurface {
  const query = hash.split("?")[1] ?? "";
  const surface = new URLSearchParams(query).get("surface");
  return isCrmSurface(surface) ? surface : fallback;
}

export function readCrmLeadIdFromHash(hash: string) {
  const query = hash.split("?")[1] ?? "";
  return new URLSearchParams(query).get("leadId");
}

export function isCrmSurface(value: string | null): value is CrmSurface {
  return crmSurfaces.has(value as CrmSurface);
}
