import type { CrmProvider } from "@lojaveiculosv2/shared";
import type { CrmProviderConnection } from "./crmConversationTypes";
import type { CrmRoutingPolicy } from "./crmRoutingTypes";

export function resolveCrmInboxConnectionSelection(input: {
  activeSessionConnectionId: string | null;
  connectionFilterId: string | null;
  connections: readonly CrmProviderConnection[];
  hasActiveSession: boolean;
  routingPolicy: CrmRoutingPolicy | null;
}) {
  const connectedIds = new Set(
    input.connections
      .filter(isConnectedConnection)
      .map((connection) => String(connection.id)),
  );
  const sandboxIds = input.connections
    .filter((connection) => connection.state === "sandbox")
    .map((connection) => String(connection.id));
  const browsableIds = new Set(
    input.connections
      .filter(isInboxBrowsableConnection)
      .map((connection) => String(connection.id)),
  );
  const filteredId =
    input.connectionFilterId && browsableIds.has(input.connectionFilterId)
      ? input.connectionFilterId
      : null;
  const channelDefault = input.routingPolicy?.channels.find(
    (channel) => channel.channel === "whatsapp",
  )?.storeDefault;
  const defaultId =
    channelDefault?.ready && channelDefault.connection?.id
      ? channelDefault.connection.id
      : null;
  const readOnlySandboxId =
    connectedIds.size === 0 && sandboxIds.length === 1
      ? (sandboxIds[0] ?? null)
      : null;
  const viewConnectionId =
    filteredId ??
    (defaultId && connectedIds.has(defaultId) ? defaultId : readOnlySandboxId);

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

export function isConnectedConnection(
  connection: Pick<CrmProviderConnection, "readiness" | "state">,
) {
  return connection.state === "active" && connection.readiness?.ready === true;
}

export function isInboxBrowsableConnection(
  connection: Pick<CrmProviderConnection, "readiness" | "state">,
) {
  return isConnectedConnection(connection) || connection.state === "sandbox";
}

export function findDefaultFreeTextStartConnection(
  connections: CrmProviderConnection[],
) {
  return (
    connections.find(
      (connection) =>
        connection.isDefault === true &&
        connection.state === "active" &&
        connection.readiness?.ready === true &&
        Array.isArray(connection.capabilities) &&
        connection.capabilities.includes("conversation_start") &&
        !connection.capabilities.includes("templates"),
    ) ?? null
  );
}

export type CrmConversationStartCapability = {
  canStart: boolean;
  mode: "template" | "text" | null;
  provider: CrmProvider | null;
  unavailableReason: string | null;
};

export function readConversationStartCapability(
  connection: CrmProviderConnection | null,
): CrmConversationStartCapability {
  if (!connection) {
    return {
      canStart: false,
      mode: null,
      provider: null,
      unavailableReason: "Conecte um canal antes de iniciar uma conversa.",
    };
  }
  if (connection.state === "paused" || connection.state === "archived") {
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
  if (
    !Array.isArray(capabilities) ||
    !capabilities.includes("conversation_start")
  ) {
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
    mode: capabilities.includes("templates") ? "template" : "text",
    provider: connection.provider,
    unavailableReason: null,
  };
}

export function buildStorefrontUrl(storeSlug?: string) {
  if (!storeSlug) return null;
  if (typeof window === "undefined") return `/${storeSlug}`;
  return `${window.location.origin}/${storeSlug}`;
}
