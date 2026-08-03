import type {
  CrmWhatsappProvider,
  CrmWhatsappProviderConnection,
} from "./crmWhatsappTypes";

export function findConnectedConnection(
  connections: CrmWhatsappProviderConnection[],
) {
  const connected = connections.filter(
    (connection) =>
      connection.live.providerStatus === "connected" ||
      connection.live.connected === true,
  );
  return (
    connected.find((connection) => connection.provider === "zapi") ??
    connected.find(
      (connection) => connection.provider === "composio_whatsapp",
    ) ??
    connected[0]
  );
}

export function findFreeTextStartConnection(
  connections: CrmWhatsappProviderConnection[],
) {
  const zapiConnections = connections.filter(
    (connection) => connection.provider === "zapi",
  );
  return (
    findConnectedConnection(zapiConnections) ??
    zapiConnections.find((connection) => connection.status !== "archived") ??
    null
  );
}

export type CrmConversationStartCapability = {
  canStart: boolean;
  mode: "template" | "text" | null;
  provider: CrmWhatsappProvider | null;
  unavailableReason: string | null;
};

export function readConversationStartCapability(
  connection: CrmWhatsappProviderConnection | null,
): CrmConversationStartCapability {
  if (!connection) {
    return {
      canStart: false,
      mode: null,
      provider: null,
      unavailableReason: "Conecte um canal antes de iniciar uma conversa.",
    };
  }
  if (connection.provider === "composio_instagram") {
    return {
      canStart: false,
      mode: null,
      provider: connection.provider,
      unavailableReason:
        "No Instagram, o cliente precisa enviar a primeira mensagem.",
    };
  }
  if (connection.provider === "composio_whatsapp") {
    return {
      canStart: true,
      mode: "template",
      provider: connection.provider,
      unavailableReason: null,
    };
  }
  return {
    canStart: true,
    mode: "text",
    provider: connection.provider,
    unavailableReason: null,
  };
}

export function buildStorefrontUrl(storeSlug?: string) {
  if (!storeSlug) return null;
  if (typeof window === "undefined") return `/${storeSlug}`;
  return `${window.location.origin}/${storeSlug}`;
}
