import type {
  CrmWhatsappOfficialSetupProvider,
  CrmWhatsappProviderConnection,
} from "./crmWhatsappTypes";

export const composioPendingConnectionKey = "crm.composio.pendingConnection";

export type PendingComposioConnection = {
  connectionId: string;
  provider: CrmWhatsappOfficialSetupProvider;
};

export function readPendingComposioConnection(): PendingComposioConnection | null {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(composioPendingConnectionKey);
  if (!stored) return null;
  try {
    const pending = JSON.parse(stored) as Partial<PendingComposioConnection>;
    return typeof pending.connectionId === "string" &&
      (pending.provider === "composio_instagram" ||
        pending.provider === "composio_whatsapp")
      ? { connectionId: pending.connectionId, provider: pending.provider }
      : null;
  } catch {
    return null;
  }
}

export function readPendingComposioConnectionId() {
  return readPendingComposioConnection()?.connectionId ?? null;
}

export function isComposioConnectionForProvider(
  connection: Pick<CrmWhatsappProviderConnection, "channel" | "provider">,
  provider: CrmWhatsappOfficialSetupProvider,
) {
  return (
    connection.provider === "meta_cloud" &&
    connection.channel ===
      (provider === "composio_instagram" ? "instagram" : "whatsapp")
  );
}

export function rememberPendingComposioConnection(
  connectionId: string,
  provider: CrmWhatsappOfficialSetupProvider,
) {
  window.sessionStorage.setItem(
    composioPendingConnectionKey,
    JSON.stringify({
      connectionId,
      provider,
    } satisfies PendingComposioConnection),
  );
}

export function clearPendingComposioConnection() {
  window.sessionStorage.removeItem(composioPendingConnectionKey);
}
