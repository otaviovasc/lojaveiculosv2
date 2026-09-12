import type {
  CrmOfficialChannelSetupProvider,
  CrmProviderConnection,
} from "./crmConversationTypes";

export const composioPendingConnectionKey = "crm.composio.pendingConnection";

export type PendingComposioConnection = {
  channel: "instagram" | "whatsapp";
  connectionId: string;
};

export function readPendingComposioConnection(): PendingComposioConnection | null {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(composioPendingConnectionKey);
  if (!stored) return null;
  try {
    const pending = JSON.parse(stored) as Partial<PendingComposioConnection>;
    return typeof pending.connectionId === "string" &&
      (pending.channel === "instagram" || pending.channel === "whatsapp")
      ? { channel: pending.channel, connectionId: pending.connectionId }
      : null;
  } catch {
    return null;
  }
}

export function readPendingComposioConnectionId() {
  return readPendingComposioConnection()?.connectionId ?? null;
}

export function isComposioConnectionForProvider(
  connection: Pick<CrmProviderConnection, "channel" | "provider">,
  channel: "instagram" | "whatsapp",
) {
  return connection.provider === "meta_cloud" && connection.channel === channel;
}

export function rememberPendingComposioConnection(
  connectionId: string,
  channel: "instagram" | "whatsapp",
) {
  window.sessionStorage.setItem(
    composioPendingConnectionKey,
    JSON.stringify({
      connectionId,
      channel,
    } satisfies PendingComposioConnection),
  );
}

export function clearPendingComposioConnection() {
  window.sessionStorage.removeItem(composioPendingConnectionKey);
}
