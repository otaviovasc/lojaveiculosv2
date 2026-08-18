import type { CrmProvider } from "@lojaveiculosv2/shared";
import type { CrmProviderConnection } from "./crmConversationTypes";

export type CrmProviderCapabilities = {
  allowAudio: boolean;
  allowCatalog: boolean;
  allowDelete: boolean;
  allowDocuments: boolean;
  allowImageCaption: boolean;
  allowImages: boolean;
  allowLocation: boolean;
  allowQuickMessages: boolean;
  allowReactions: boolean;
  allowReply: boolean;
  allowScheduling: boolean;
  allowVehicle: boolean;
  allowVideo: boolean;
  officialWindowNotice: string | null;
  provider: CrmProvider;
};

const UNKNOWN_PROVIDER_CAPABILITIES: CrmProviderCapabilities = {
  allowAudio: false,
  allowCatalog: false,
  allowDelete: false,
  allowDocuments: false,
  allowImageCaption: false,
  allowImages: false,
  allowLocation: false,
  allowQuickMessages: false,
  allowReactions: false,
  allowReply: false,
  allowScheduling: false,
  allowVehicle: false,
  allowVideo: false,
  officialWindowNotice:
    "O provedor deste canal não é reconhecido. O envio fica bloqueado até a configuração ser confirmada.",
  provider: "zapi",
};

/**
 * Translate the capability facts attached to the active connection into the
 * composer surface. Missing facts intentionally produce a closed composer;
 * provider names are not a capability contract.
 */
export function readCrmConnectionCapabilities(
  connection:
    | Pick<
        CrmProviderConnection,
        "capabilities" | "channel" | "provider" | "status"
      >
    | null
    | undefined,
): CrmProviderCapabilities {
  const capabilities = connection?.capabilities;
  if (!capabilities || typeof connection?.provider !== "string") {
    return UNKNOWN_PROVIDER_CAPABILITIES;
  }
  if (connection.status === "paused") {
    return {
      ...UNKNOWN_PROVIDER_CAPABILITIES,
      officialWindowNotice:
        "Este canal está pausado no CRM. Retome a conexão para enviar mensagens.",
      provider: connection.provider as CrmProvider,
    };
  }

  const canonical = Array.isArray(capabilities)
    ? new Set(capabilities)
    : new Set<string>();
  return {
    allowAudio: canonical.has("media"),
    allowCatalog: false,
    allowDelete: false,
    allowDocuments: canonical.has("media"),
    allowImageCaption: canonical.has("media") && canonical.has("text"),
    allowImages: canonical.has("media"),
    allowLocation: canonical.has("media"),
    allowQuickMessages: canonical.has("text"),
    allowReactions: false,
    allowReply: canonical.has("outbound"),
    allowScheduling: canonical.has("scheduling"),
    allowVehicle: canonical.has("media"),
    allowVideo: canonical.has("media"),
    officialWindowNotice: readProviderWindowNotice(
      connection.provider,
      connection.channel,
    ),
    provider: connection.provider as CrmProvider,
  };
}

function readProviderWindowNotice(provider: string, channel?: string) {
  if (provider === "meta_cloud" && channel === "whatsapp") {
    return "WhatsApp oficial: mensagens livres exigem interação recente do cliente. Fora da janela, inicie com um template aprovado.";
  }
  if (provider === "meta_cloud" && channel === "instagram") {
    return "Instagram oficial: o atendimento só envia texto ou imagem em uma conversa iniciada recentemente pelo cliente.";
  }
  return null;
}

export function readCrmSendReadiness(connection: CrmProviderConnection | null) {
  if (!connection) {
    return {
      canSend: false,
      reason: "O canal ainda não foi identificado.",
    };
  }
  if (
    connection.state === "paused" ||
    connection.state === "archived" ||
    connection.state === "disconnected" ||
    connection.state === "error"
  ) {
    return {
      canSend: false,
      reason: "Este canal está pausado ou indisponível no CRM.",
    };
  }
  const capabilities = connection.capabilities;
  if (!capabilities) {
    return {
      canSend: false,
      reason: "As capacidades deste canal ainda não foram confirmadas.",
    };
  }
  if (!Array.isArray(capabilities) || !capabilities.includes("text")) {
    return {
      canSend: false,
      reason: "Este canal não permite envio de texto.",
    };
  }
  if (connection.readiness?.ready !== true) {
    return {
      canSend: false,
      reason: "O provedor ainda não está pronto para envio.",
    };
  }
  return { canSend: true, reason: null };
}
