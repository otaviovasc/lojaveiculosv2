export type CrmSurface = "leads" | "whatsapp";

const crmSurfaces = new Set<CrmSurface>(["leads", "whatsapp"]);

export function crmSurfaceHash(surface: CrmSurface) {
  return `/crm?surface=${surface}`;
}

export function readCrmSurfaceFromHash(
  hash: string,
  fallback: CrmSurface = "whatsapp",
): CrmSurface {
  const query = hash.split("?")[1] ?? "";
  const surface = new URLSearchParams(query).get("surface");
  return isCrmSurface(surface) ? surface : fallback;
}

export function isCrmSurface(value: string | null): value is CrmSurface {
  return crmSurfaces.has(value as CrmSurface);
}
