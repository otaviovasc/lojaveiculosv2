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
    (connection) => connection.provider === "olx_chat",
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
    (capability.status !== "active" || capability.grantState !== "granted")
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
  if (
    connection.live.providerStatus === "connected" ||
    (connection.status === "active" && connection.ready === true)
  ) {
    return {
      detail: "Texto disponível em conversas iniciadas pelo comprador.",
      label: "Chat",
      state: "active",
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
