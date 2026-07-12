import type { MarketplaceAccount, MarketplaceProviderState } from "./types";

type MarketplaceConnectionPresentation = {
  canSync: boolean;
  connectLabel: string | null;
  statusAction: {
    label: "Ativar" | "Pausar";
    status: "active" | "inactive";
  } | null;
  tone: "danger" | "neutral" | "success" | "warning";
};

export function resolveMarketplaceConnectionPresentation(
  state: MarketplaceProviderState | undefined,
  account: MarketplaceAccount | undefined,
): MarketplaceConnectionPresentation {
  const connectionStatus = state?.connectionStatus;

  if (connectionStatus === "connected" || connectionStatus === "refreshable") {
    return {
      canSync: true,
      connectLabel: "Gerenciar conexão",
      statusAction: { label: "Pausar", status: "inactive" },
      tone: "success",
    };
  }

  if (connectionStatus === "reconnect_required") {
    return {
      canSync: false,
      connectLabel: "Reconectar conta",
      statusAction: null,
      tone: "danger",
    };
  }

  if (connectionStatus === "blocked") {
    return {
      canSync: false,
      connectLabel: "Revisar conexão",
      statusAction: null,
      tone: "danger",
    };
  }

  if (connectionStatus === "paused" || connectionStatus === "degraded") {
    return {
      canSync: false,
      connectLabel: connectionStatus === "degraded" ? "Revisar conexão" : null,
      statusAction:
        connectionStatus === "paused"
          ? { label: "Ativar", status: "active" }
          : null,
      tone: "warning",
    };
  }

  if (connectionStatus) {
    return {
      canSync: false,
      connectLabel: "Conectar conta",
      statusAction: null,
      tone: "neutral",
    };
  }

  if (account?.status === "error") {
    return {
      canSync: false,
      connectLabel: "Revisar conexão",
      statusAction: null,
      tone: "danger",
    };
  }

  if (account?.status === "inactive") {
    return {
      canSync: false,
      connectLabel: null,
      statusAction: { label: "Ativar", status: "active" },
      tone: "warning",
    };
  }

  if (account?.status === "active") {
    return {
      canSync: true,
      connectLabel: "Gerenciar conexão",
      statusAction: { label: "Pausar", status: "inactive" },
      tone: "success",
    };
  }

  return {
    canSync: false,
    connectLabel: "Conectar conta",
    statusAction: null,
    tone: "neutral",
  };
}
