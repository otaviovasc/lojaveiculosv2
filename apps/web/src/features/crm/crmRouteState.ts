export type CrmSurface = "leads" | "conversations";

const crmSurfaces = new Set<CrmSurface>(["leads", "conversations"]);

export function crmSurfaceHash(surface: CrmSurface) {
  return `/crm?surface=${surface}`;
}

export function crmConversationCycleHash(cycleId: string | number) {
  return `/crm?surface=conversations&cycleId=${encodeURIComponent(String(cycleId))}`;
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
