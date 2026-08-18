import type {
  CrmWhatsappProvider,
  CrmWhatsappProviderConnection,
} from "./crmWhatsappTypes";
import type { CrmRoutingPolicy } from "./crmRoutingTypes";

export function resolveCrmInboxConnectionSelection(input: {
  activeSessionConnectionId: string | null;
  connectionFilterId: string | null;
  connections: readonly CrmWhatsappProviderConnection[];
  hasActiveSession: boolean;
  routingPolicy: CrmRoutingPolicy | null;
}) {
  const connectedIds = new Set(
    input.connections
      .filter(isConnectedConnection)
      .map((connection) => String(connection.id)),
  );
  const filteredId =
    input.connectionFilterId && connectedIds.has(input.connectionFilterId)
      ? input.connectionFilterId
      : null;
  const whatsappDefault = input.routingPolicy?.channels.find(
    (channel) => channel.channel === "whatsapp",
  )?.storeDefault;
  const defaultId =
    whatsappDefault?.ready && whatsappDefault.connection?.id
      ? whatsappDefault.connection.id
      : null;
  const viewConnectionId =
    filteredId ?? (defaultId && connectedIds.has(defaultId) ? defaultId : null);

  if (!input.hasActiveSession) {
    return {
      operationalConnectionId: viewConnectionId,
      viewConnectionId,
    };
  }
  const activeSessionConnectionId = input.activeSessionConnectionId;
  const activeConnectionExists = input.connections.some(
    (connection) => String(connection.id) === activeSessionConnectionId,
  );
  return {
    operationalConnectionId:
      activeSessionConnectionId && activeConnectionExists
        ? activeSessionConnectionId
        : null,
    viewConnectionId,
  };
}

export function findConnectedConnection(
  connections: readonly CrmWhatsappProviderConnection[],
) {
  return resolveSingleReadyConnection(connections);
}

/** A start operation may only use an unambiguous, server-ready route. */
export function resolveSingleReadyConnection(
  connections: readonly CrmWhatsappProviderConnection[],
) {
  const ready = connections.filter(isConnectedConnection);
  return ready.length === 1 ? (ready[0] ?? null) : null;
}

export function isConnectedConnection(
  connection: Pick<
    CrmWhatsappProviderConnection,
    "live" | "status" | "readiness"
  >,
) {
  if (connection.readiness) return connection.readiness.ready;
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
  return resolveSingleReadyConnection(startableConnections);
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
  if (connection.readiness && !connection.readiness.ready) {
    return {
      canStart: false,
      mode: null,
      provider: connection.provider,
      unavailableReason:
        connection.readiness.reason ??
        "Este canal ainda não está pronto para o CRM.",
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
        connection.channel === "instagram"
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
