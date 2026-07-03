import type { CrmWhatsappProviderConnection } from "./crmWhatsappTypes";

export function findConnectedConnection(
  connections: CrmWhatsappProviderConnection[],
) {
  return connections.find(
    (connection) =>
      connection.live.providerStatus === "connected" ||
      connection.live.connected === true,
  );
}

export function buildStorefrontUrl(storeSlug?: string) {
  if (!storeSlug) return null;
  if (typeof window === "undefined") return `/${storeSlug}`;
  return `${window.location.origin}/${storeSlug}`;
}
