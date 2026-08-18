import type {
  MarketplaceProviderCapability,
  MarketplaceProviderState,
} from "../marketplaces/types";
import type { CrmWhatsappProviderConnection } from "./crmWhatsappTypes";
import {
  readCrmWhatsappChannelLabel,
  readCrmWhatsappProviderLabel,
} from "./crmWhatsappConnectionStatus";

export type CrmChannelIdentity = {
  brokerLabel: string | null;
  channelLabel: string;
  providerLabel: string | null;
};

export function readCrmChannelIdentity(input: {
  broker?: string | null;
  channel: string;
  provider?: string | null;
}): CrmChannelIdentity {
  return {
    brokerLabel: input.broker?.trim() || null,
    channelLabel: readCrmWhatsappChannelLabel(input.channel),
    providerLabel: input.provider
      ? readCrmWhatsappProviderLabel(input.provider)
      : null,
  };
}

export type CrmChannelOperationState =
  | "active"
  | "degraded"
  | "failed"
  | "indeterminate"
  | "not_connected"
  | "pending";

export type CrmChannelOperation = {
  detail: string;
  label: string;
  state: CrmChannelOperationState;
};

export type OlxAuthorizationAction = {
  description: string;
  label: "Autorizar OLX" | "Reautorizar OLX" | "Reconfigurar OLX";
};

export function readOlxChannelOperations(
  connections: readonly CrmWhatsappProviderConnection[],
  marketplaceState?: MarketplaceProviderState,
): {
  chat: CrmChannelOperation;
  leads: CrmChannelOperation;
  stock: CrmChannelOperation;
} {
  const chatConnection = connections.find(
    (connection) => connection.channel === "olx_chat",
  );
  const chat = readOlxChatOperation(chatConnection, marketplaceState);
  const leads = readOlxLeadsOperation(marketplaceState);
  const stock = readOlxStockOperation(marketplaceState);
  return { chat, leads, stock };
}

function readOlxChatOperation(
  connection?: CrmWhatsappProviderConnection,
  marketplaceState?: MarketplaceProviderState,
): CrmChannelOperation {
  const authorizationFailure = readAuthorizationFailure(marketplaceState);
  if (authorizationFailure) {
    return { ...authorizationFailure, label: "Chat" };
  }
  const capability = marketplaceState?.capabilities?.chat;
  if (
    capability &&
    (capability.status !== "active" ||
      capability.grantState !== "granted" ||
      isProviderOutcomeIndeterminate(capability))
  ) {
    return readCapabilityOperation(
      capability,
      "Chat",
      "Texto disponível em conversas iniciadas pelo comprador.",
    );
  }
  if (!connection) {
    return capability
      ? readCapabilityOperation(
          capability,
          "Chat",
          "Texto disponível em conversas iniciadas pelo comprador.",
        )
      : {
          detail: "O setup do Chat ainda não foi confirmado pelo servidor.",
          label: "Chat",
          state: "indeterminate",
        };
  }
  if (connection.readiness?.ready === true) {
    return {
      detail: "Texto disponível em conversas iniciadas pelo comprador.",
      label: "Chat",
      state: "active",
    };
  }
  if (connection.readiness?.ready === false) {
    return {
      detail:
        connection.readiness.reason ??
        "O servidor informou que o Chat ainda não está pronto.",
      label: "Chat",
      state: "failed",
    };
  }
  if (connection.live.providerStatus === "error") {
    return {
      detail:
        "O Chat está configurado, mas a checagem atual falhou. Tente novamente.",
      label: "Chat",
      state: "degraded",
    };
  }
  if (connection.status === "error" || connection.status === "archived") {
    return {
      detail: "Corrija ou refaça o setup do Chat antes de atender conversas.",
      label: "Chat",
      state: "failed",
    };
  }
  return {
    detail: "A conexão existe, mas o recebimento ainda não foi confirmado.",
    label: "Chat",
    state:
      connection.live.providerStatus === "unknown"
        ? "indeterminate"
        : "pending",
  };
}

function readOlxLeadsOperation(
  state?: MarketplaceProviderState,
): CrmChannelOperation {
  return readOlxCapability(
    state,
    "leads",
    "Leads",
    "Webhook de leads confirmado.",
  );
}

function readOlxStockOperation(
  state?: MarketplaceProviderState,
): CrmChannelOperation {
  return readOlxCapability(
    state,
    "stock",
    "Estoque",
    "Escopo de estoque autorizado. Nenhum anúncio é enviado automaticamente.",
  );
}

function readOlxCapability(
  state: MarketplaceProviderState | undefined,
  key: "leads" | "stock",
  label: string,
  activeDetail: string,
): CrmChannelOperation {
  const authorizationFailure = readAuthorizationFailure(state);
  if (authorizationFailure) return { ...authorizationFailure, label };
  const capability = state?.capabilities?.[key];
  if (!capability) {
    return {
      detail: "O servidor ainda não confirmou este escopo e seu setup.",
      label,
      state: state ? "pending" : "indeterminate",
    };
  }
  return readCapabilityOperation(capability, label, activeDetail);
}

function readCapabilityOperation(
  capability: MarketplaceProviderCapability,
  label: string,
  activeDetail: string,
): CrmChannelOperation {
  const reason = capability.reason as string | null;
  if (reason === "provider_outcome_indeterminate") {
    return {
      detail:
        "A OLX retornou erro interno durante a ativação. Não repita o setup automaticamente; aguarde ou acione o suporte de integração.",
      label,
      state: "indeterminate",
    };
  }
  if (capability.status === "active" && capability.grantState === "granted") {
    return { detail: activeDetail, label, state: "active" };
  }
  if (capability.reason === "missing_scope") {
    return {
      detail: "Escopo ausente. Reautorize a OLX para conceder este acesso.",
      label,
      state: "failed",
    };
  }
  if (capability.reason === "access_denied") {
    return {
      detail:
        "Acesso indisponível para esta loja ou usuário. Fale com um administrador.",
      label,
      state: "failed",
    };
  }
  return {
    detail:
      capability.reason === "runtime_unavailable"
        ? "O setup não pôde ser verificado agora. Tente reconfigurar mais tarde."
        : "O provedor recusou o setup. Revise a conta e tente reconfigurar.",
    label,
    state: capability.reason === "runtime_unavailable" ? "degraded" : "failed",
  };
}

function isProviderOutcomeIndeterminate(
  capability?: MarketplaceProviderCapability,
) {
  return (
    (capability?.reason as string | null | undefined) ===
    "provider_outcome_indeterminate"
  );
}

function readAuthorizationFailure(
  state?: MarketplaceProviderState,
): Omit<CrmChannelOperation, "label"> | null {
  if (
    !state?.accountId ||
    state.connectionStatus === "not_configured" ||
    state.connectionStatus === "not_connected"
  ) {
    return {
      detail: "Autorize a conta OLX para habilitar esta capacidade.",
      state: "not_connected",
    };
  }
  if (
    state?.connectionStatus === "reconnect_required" ||
    state?.connectionStatus === "blocked"
  ) {
    return {
      detail:
        "A autorização foi revogada ou bloqueada. Reautorize a conta OLX.",
      state: "failed",
    };
  }
  if (state?.connectionStatus === "paused") {
    return {
      detail: "A conta está pausada. Retome-a no módulo Marketplace.",
      state: "pending",
    };
  }
  return null;
}

export const crmChannelGroupOrder = [
  "whatsapp",
  "instagram",
  "olx_chat",
] as const;

export type CrmChannelGroupChannel = (typeof crmChannelGroupOrder)[number];

export type CrmChannelConnectionGroup = {
  channel: CrmChannelGroupChannel | "unknown";
  channelLabel: string;
  connections: CrmWhatsappProviderConnection[];
  invalid?: boolean;
};

/**
 * Groups strictly by the server-owned DTO `channel` field. Connections with a
 * missing or unrecognized channel land in an explicit invalid group — the
 * provider name is never used to guess a channel (ADR 0061).
 */
export function groupCrmConnectionsByChannel(
  connections: readonly CrmWhatsappProviderConnection[],
): CrmChannelConnectionGroup[] {
  const groups: CrmChannelConnectionGroup[] = crmChannelGroupOrder.map(
    (channel) => ({
      channel,
      channelLabel: readCrmWhatsappChannelLabel(channel),
      connections: [] as CrmWhatsappProviderConnection[],
    }),
  );
  const invalid: CrmChannelConnectionGroup = {
    channel: "unknown",
    channelLabel: "Canal não identificado",
    connections: [],
    invalid: true,
  };
  for (const connection of connections) {
    if (connection.status === "archived" || connection.state === "archived") {
      continue;
    }
    const group = groups.find(
      (candidate) => candidate.channel === connection.channel,
    );
    if (group) {
      group.connections.push(connection);
    } else {
      invalid.connections.push(connection);
    }
  }
  return [...groups, invalid].filter((group) => group.connections.length > 0);
}

export type CrmConnectionReadinessBadge = {
  detail: string | null;
  label: string;
  tone: "danger" | "neutral" | "success" | "warning";
};

export function readConnectionReadinessBadge(
  connection: CrmWhatsappProviderConnection,
): CrmConnectionReadinessBadge {
  const status = connection.state ?? connection.status;
  if (status === "paused") {
    return {
      detail: connection.readiness?.reason ?? null,
      label: "Pausado",
      tone: "neutral",
    };
  }
  if (status === "error") {
    return {
      detail: connection.readiness?.reason ?? null,
      label: "Erro",
      tone: "danger",
    };
  }
  if (connection.readiness?.ready === true) {
    return { detail: null, label: "Pronto", tone: "success" };
  }
  if (!connection.readiness) {
    return {
      detail: "A API não informou a prontidão desta conexão.",
      label: "Estado de prontidão indisponível",
      tone: "warning",
    };
  }
  return {
    detail: connection.readiness?.reason ?? null,
    label: connection.readiness?.reason ?? "Requer configuração",
    tone: "warning",
  };
}

const capabilityLabelMap = {
  audio: "Áudio",
  catalog: "Catálogo",
  conversationStart: "Novas conversas",
  documents: "Documentos",
  imageCaption: "Legenda em imagens",
  images: "Imagens",
  location: "Localização",
  quickMessages: "Respostas rápidas",
  reactions: "Reações",
  reply: "Respostas citadas",
  scheduling: "Agendamento",
  templates: "Templates",
  text: "Texto",
  vehicle: "Veículos",
  video: "Vídeo",
} as const;

export function readCrmCapabilityLabel(capability: string) {
  return (
    capabilityLabelMap[capability as keyof typeof capabilityLabelMap] ??
    capability
  );
}

export function readConnectionCapabilityLabels(
  connection: CrmWhatsappProviderConnection,
  limit = 4,
): string[] {
  const capabilities = connection.capabilities;
  if (!capabilities) return [];
  return Object.entries(capabilityLabelMap)
    .filter(([key]) => capabilities[key as keyof typeof capabilityLabelMap])
    .map(([, label]) => label)
    .slice(0, limit);
}

export type OlxChatRetryTarget = {
  connectionId: string;
  detail: string;
};

/**
 * Returns the OLX Chat connection that can retry its server-side setup when
 * the authorization itself is fine (no missing scope, no reconnect required)
 * but the provider-internal Chat setup failed or degraded. Never use this to
 * decide a new OAuth authorization.
 */
export function readOlxChatRetryTarget(
  connections: readonly CrmWhatsappProviderConnection[],
  marketplaceState?: MarketplaceProviderState,
): OlxChatRetryTarget | null {
  const connection = connections.find(
    (candidate) => candidate.channel === "olx_chat",
  );
  if (!connection || !marketplaceState) return null;
  if (!marketplaceState.accountId) return null;
  if (marketplaceState.connectionStatus !== "connected") {
    return null;
  }
  const chatCapability = marketplaceState.capabilities?.chat;
  if (isProviderOutcomeIndeterminate(chatCapability)) {
    return null;
  }
  if (
    chatCapability?.reason === "missing_scope" ||
    chatCapability?.reason === "access_denied"
  ) {
    return null;
  }
  if (connection.readiness?.ready !== false) return null;
  const chat = readOlxChatOperation(connection, marketplaceState);
  if (chat.state !== "failed" && chat.state !== "degraded") return null;
  return { connectionId: String(connection.id), detail: chat.detail };
}

export function readOlxAuthorizationAction(
  state?: MarketplaceProviderState,
  chatOperation?: Pick<CrmChannelOperation, "state">,
): OlxAuthorizationAction | null {
  if (!state?.accountId || state.connectionStatus === "not_configured") {
    return {
      description: "Abre o OAuth da OLX para autorizar esta conta.",
      label: "Autorizar OLX",
    };
  }
  if (
    state.connectionStatus === "not_connected" ||
    state.connectionStatus === "reconnect_required" ||
    state.connectionStatus === "blocked" ||
    Object.values(state.capabilities ?? {}).some(
      (capability) => capability.reason === "missing_scope",
    )
  ) {
    return {
      description: "Renova a autorização ou concede os escopos ausentes.",
      label: "Reautorizar OLX",
    };
  }
  if (
    Object.values(state.capabilities ?? {}).some(
      (capability) =>
        capability.reason === "provider_rejected" ||
        capability.reason === "runtime_unavailable",
    )
  ) {
    return {
      description: "Refaz o setup das capacidades que falharam.",
      label: "Reconfigurar OLX",
    };
  }
  if (
    chatOperation?.state === "pending" ||
    chatOperation?.state === "degraded" ||
    chatOperation?.state === "failed"
  ) {
    return {
      description:
        "Refaz o setup do Chat e revalida o callback de recebimento.",
      label: "Reconfigurar OLX",
    };
  }
  return null;
}
