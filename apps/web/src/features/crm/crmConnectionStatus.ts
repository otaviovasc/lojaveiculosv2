import type { CrmProvider } from "@lojaveiculosv2/shared";
import type { CrmConnectionConfiguredStatus } from "./crmConversationTypes";

export function readCrmConnectionStatus(input: {
  hasConnection: boolean;
  isLoading: boolean;
  connectionError: Error | null;
  provider?: CrmProvider | null;
  state?: CrmConnectionConfiguredStatus;
}): {
  label: string;
  tone: "error" | "loading" | "neutral" | "offline" | "online";
} {
  if (input.state === "sandbox") {
    return { label: "Demonstração · somente leitura", tone: "neutral" };
  }
  if (input.hasConnection) {
    return {
      label: input.provider
        ? `${readCrmProviderLabel(input.provider)}: online`
        : "Canal conectado",
      tone: "online",
    };
  }
  if (input.isLoading) return { label: "Verificando", tone: "loading" };
  if (input.connectionError) {
    return {
      label: input.provider
        ? `${readCrmProviderLabel(input.provider)}: indisponivel`
        : "Provedor indisponivel",
      tone: "error",
    };
  }
  if (input.hasConnection === false) {
    return { label: "Desconectado", tone: "offline" };
  }
  return { label: "Mensagens", tone: "neutral" };
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
