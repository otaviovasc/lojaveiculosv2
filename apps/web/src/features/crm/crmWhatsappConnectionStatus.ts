import type { CrmWhatsappProvider } from "./crmWhatsappTypes";

export function readWhatsappStatus(input: {
  hasConnection: boolean;
  isLoading: boolean;
  connectionError: Error | null;
  provider?: CrmWhatsappProvider | null;
}): {
  label: string;
  tone: "error" | "loading" | "neutral" | "offline" | "online";
} {
  if (input.hasConnection) {
    return {
      label: input.provider
        ? `${readCrmWhatsappProviderLabel(input.provider)}: online`
        : "Canal conectado",
      tone: "online",
    };
  }
  if (input.isLoading) return { label: "Verificando", tone: "loading" };
  if (input.connectionError) {
    return {
      label: input.provider
        ? `${readCrmWhatsappProviderLabel(input.provider)}: indisponivel`
        : "Provedor indisponivel",
      tone: "error",
    };
  }
  if (input.hasConnection === false) {
    return { label: "Desconectado", tone: "offline" };
  }
  return { label: "Mensagens", tone: "neutral" };
}

export function readCrmWhatsappProviderLabel(provider: CrmWhatsappProvider) {
  switch (provider) {
    case "zapi":
      return "Z-API";
    case "composio_whatsapp":
      return "WhatsApp oficial (Composio)";
    case "composio_instagram":
      return "Instagram (Composio)";
  }
}
