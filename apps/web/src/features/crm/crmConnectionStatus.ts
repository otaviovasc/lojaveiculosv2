import type { CrmProvider } from "@lojaveiculosv2/shared";
import type {
  CrmConnectionConfiguredStatus,
  CrmProviderConnection,
  CrmRealtimeStatus,
} from "./crmConversationTypes";

export type CrmConnectionTone =
  "error" | "loading" | "neutral" | "offline" | "online";

export type CrmConnectionStatus = {
  label: string;
  tone: CrmConnectionTone;
};

export function readCrmConnectionStatus(input: {
  hasConnection: boolean;
  isLoading: boolean;
  connectionError: Error | null;
  provider?: CrmProvider | null;
  state?: CrmConnectionConfiguredStatus;
}): CrmConnectionStatus {
  const state = input.state;
  switch (state) {
    case "active":
      return input.hasConnection
        ? connectedProviderStatus(input.provider)
        : { label: "Status do provedor desconhecido", tone: "neutral" };
    case "archived":
      return { label: "Canal arquivado", tone: "offline" };
    case "disconnected":
      return providerStatus(input.provider, "desconectado", "offline");
    case "error":
      return providerStatus(input.provider, "com erro", "error");
    case "paused":
      return providerStatus(input.provider, "pausado", "offline");
    case "sandbox":
      return { label: "Demonstração · somente leitura", tone: "neutral" };
    case undefined:
      if (input.isLoading) {
        return { label: "Verificando provedor", tone: "loading" };
      }
      if (input.connectionError) {
        return { label: "Status do provedor indisponível", tone: "error" };
      }
      return input.hasConnection
        ? connectedProviderStatus(input.provider)
        : { label: "Canal desconectado", tone: "offline" };
  }
  return assertNever(state);
}

export function findCrmStatusConnection(
  connections: readonly CrmProviderConnection[],
  selectedConnectionId: string | null,
) {
  return (
    connections.find(
      (connection) => String(connection.id) === selectedConnectionId,
    ) ??
    connections.find((connection) => connection.isDefault === true) ??
    (connections.length === 1 ? (connections[0] ?? null) : null)
  );
}

export function readCrmRealtimeStatus(
  status: CrmRealtimeStatus,
): CrmConnectionStatus {
  switch (status) {
    case "connected":
      return { label: "Tempo real: sincronizado", tone: "online" };
    case "connecting":
      return { label: "Tempo real: reconectando", tone: "loading" };
    case "degraded":
      return { label: "Tempo real: indisponível", tone: "error" };
    case "offline":
      return { label: "Tempo real: offline", tone: "offline" };
  }
  return assertNever(status);
}

function assertNever(value: never): never {
  throw new Error(`Estado de conexão inesperado: ${String(value)}`);
}

function connectedProviderStatus(
  provider: CrmProvider | null | undefined,
): CrmConnectionStatus {
  return providerStatus(provider, "online", "online");
}

function providerStatus(
  provider: CrmProvider | null | undefined,
  stateLabel: string,
  tone: CrmConnectionTone,
): CrmConnectionStatus {
  return {
    label: provider
      ? `${readCrmProviderLabel(provider)}: ${stateLabel}`
      : `Canal ${stateLabel}`,
    tone,
  };
}

export function readCrmProviderLabel(provider: string) {
  switch (provider) {
    case "zapi":
      return "Z-API";
    case "meta_cloud":
      return "WhatsApp oficial";
    case "olx":
      return "OLX Chat";
    default:
      return "Provedor desconhecido";
  }
}

export function readCrmProviderIcon(provider: string) {
  if (provider === "olx") {
    return "olx" as const;
  }
  if (provider === "zapi" || provider === "meta_cloud") {
    return "whatsapp" as const;
  }
  return "unknown" as const;
}

export function readCrmChannelLabel(channel: string) {
  switch (channel) {
    case "whatsapp":
      return "WhatsApp";
    case "instagram":
      return "Instagram";
    case "olx_chat":
      return "OLX Chat";
    default:
      return "Canal desconhecido";
  }
}
