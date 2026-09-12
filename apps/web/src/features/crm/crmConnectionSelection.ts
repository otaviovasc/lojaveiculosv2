import type { CrmProvider } from "@lojaveiculosv2/shared";
import type { CrmProviderConnection } from "./crmConversationTypes";
import type { CrmRoutingPolicy } from "./crmRoutingTypes";

export function isUiDemoConnection(
  connection: Pick<CrmProviderConnection, "purpose"> | null | undefined,
) {
  return connection?.purpose === "ui_demo";
}

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
  const preferredReadOnlyDemoIds = input.connections
    .filter(
      (connection) =>
        connection.state === "sandbox" && isUiDemoConnection(connection),
    )
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
  // A route the policy explicitly blocks must stay fail-closed; it is never a
  // fallback candidate even when the connection DTO still looks ready.
  const blockedDefaultId =
    channelDefault && !channelDefault.ready && channelDefault.connection?.id
      ? String(channelDefault.connection.id)
      : null;
  const readOnlySandboxId =
    preferredReadOnlyDemoIds.length === 1
      ? (preferredReadOnlyDemoIds[0] ?? null)
      : connectedIds.size === 0 && sandboxIds.length === 1
        ? (sandboxIds[0] ?? null)
        : null;
  // When no ready store default exists (default not ready, or default bound to
  // another channel), fall back to the first connected connection so the queue
  // never renders empty while a usable connection exists.
  const firstConnectedId =
    input.connections
      .filter(isConnectedConnection)
      .map((connection) => String(connection.id))
      .find((connectionId) => connectionId !== blockedDefaultId) ?? null;
  const viewConnectionId =
    filteredId ??
    (defaultId && connectedIds.has(defaultId)
      ? defaultId
      : readOnlySandboxId) ??
    firstConnectedId;

  if (!input.hasActiveSession) {
    return {
      operationalConnectionId: viewConnectionId,
      viewConnectionId,
    };
  }
  const activeSessionConnectionId = input.activeSessionConnectionId;
  return {
    operationalConnectionId: activeSessionConnectionId,
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

/** Connections the CRM can start a new conversation from, per the
 * server-owned capability DTO (never inferred from the provider name). */
export function listConversationStartConnections(
  connections: readonly CrmProviderConnection[],
) {
  return connections.filter(
    (connection) => readConversationStartCapability(connection).canStart,
  );
}

export function listFreeTextStartConnections(
  connections: readonly CrmProviderConnection[],
) {
  return connections.filter((connection) => {
    const capability = readConversationStartCapability(connection);
    return capability.canStart && capability.mode === "text";
  });
}

/** Single resolution order for start targets: the preferred (view) connection
 * when eligible, else the store default, else the first eligible connection. */
export function resolveConversationStartConnection(input: {
  connections: readonly CrmProviderConnection[];
  preferredConnectionId?: string | null;
}) {
  return resolveFromEligible(
    listConversationStartConnections(input.connections),
    input.preferredConnectionId,
  );
}

/** Same resolution order restricted to free-text (non-template) starts. */
export function resolveFreeTextStartConnection(input: {
  connections: readonly CrmProviderConnection[];
  preferredConnectionId?: string | null;
}) {
  return resolveFromEligible(
    listFreeTextStartConnections(input.connections),
    input.preferredConnectionId,
  );
}

function resolveFromEligible(
  eligible: readonly CrmProviderConnection[],
  preferredConnectionId?: string | null,
) {
  if (eligible.length === 0) return null;
  const preferred = preferredConnectionId
    ? eligible.find(
        (connection) => String(connection.id) === String(preferredConnectionId),
      )
    : null;
  return (
    preferred ??
    eligible.find((connection) => connection.isDefault) ??
    eligible[0] ??
    null
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
