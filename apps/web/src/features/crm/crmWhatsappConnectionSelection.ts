import type {
  CrmWhatsappProvider,
  CrmWhatsappProviderConnection,
} from "./crmWhatsappTypes";

export function findConnectedConnection(
  connections: CrmWhatsappProviderConnection[],
) {
  const connected = connections.filter(isConnectedConnection);
  return (
    connected.find((connection) => connection.provider === "zapi") ??
    connected.find(
      (connection) => connection.provider === "composio_whatsapp",
    ) ??
    connected[0]
  );
}

export function isConnectedConnection(
  connection: Pick<CrmWhatsappProviderConnection, "live" | "status">,
) {
  return (
    connection.status !== "paused" &&
    connection.status !== "archived" &&
    connection.status !== "disconnected" &&
    connection.status !== "error" &&
    (connection.live.providerStatus === "connected" ||
      connection.live.connected === true)
  );
}

export function findFreeTextStartConnection(
  connections: CrmWhatsappProviderConnection[],
) {
  const startableConnections = connections.filter(
    (connection) =>
      connection.status !== "paused" &&
      connection.status !== "archived" &&
      connection.capabilities?.conversationStart === true &&
      connection.capabilities.templates !== true,
  );
  return findConnectedConnection(startableConnections) ?? null;
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
  if (connection.status === "paused" || connection.status === "archived") {
    return {
      canStart: false,
      mode: null,
      provider: connection.provider,
      unavailableReason: "Este canal está pausado ou indisponível no CRM.",
    };
  }
  const capabilities = connection.capabilities;
  if (!capabilities) {
    return {
      canStart: false,
      mode: null,
      provider: connection.provider,
      unavailableReason:
        "As capacidades deste canal ainda não foram confirmadas.",
    };
  }
  if (capabilities.conversationStart !== true) {
    return {
      canStart: false,
      mode: null,
      provider: connection.provider,
      unavailableReason:
        connection.provider === "composio_instagram"
          ? "No Instagram, o cliente precisa enviar a primeira mensagem."
          : "Este canal não permite iniciar novas conversas pelo CRM.",
    };
  }
  return {
    canStart: true,
    mode: capabilities.templates === true ? "template" : "text",
    provider: connection.provider,
    unavailableReason: null,
  };
}

export function buildStorefrontUrl(storeSlug?: string) {
  if (!storeSlug) return null;
  if (typeof window === "undefined") return `/${storeSlug}`;
  return `${window.location.origin}/${storeSlug}`;
}
