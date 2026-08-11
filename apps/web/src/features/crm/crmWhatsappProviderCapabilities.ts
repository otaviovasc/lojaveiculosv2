import type {
  CrmWhatsappProviderCapabilities as CrmWhatsappProviderCapabilitiesDto,
  CrmWhatsappProvider,
  CrmWhatsappProviderConnection,
  CrmWhatsappRealtimeStatus,
} from "./crmWhatsappTypes";

export type CrmWhatsappProviderCapabilities = {
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
  provider: CrmWhatsappProvider;
};

const UNKNOWN_PROVIDER_CAPABILITIES: CrmWhatsappProviderCapabilities = {
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
  provider: "unknown",
};

/**
 * Translate the capability facts attached to the active connection into the
 * composer surface. Missing facts intentionally produce a closed composer;
 * provider names are not a capability contract.
 */
export function readCrmWhatsappConnectionCapabilities(
  connection:
    | Pick<CrmWhatsappProviderConnection, "capabilities" | "provider">
    | { capabilities?: CrmWhatsappProviderCapabilitiesDto; provider?: string }
    | null
    | undefined,
): CrmWhatsappProviderCapabilities {
  const dto = connection?.capabilities;
  if (!dto || typeof connection?.provider !== "string") {
    return UNKNOWN_PROVIDER_CAPABILITIES;
  }

  return {
    allowAudio: dto.audio === true,
    allowCatalog: dto.catalog === true,
    allowDelete: dto.delete === true,
    allowDocuments: dto.documents === true,
    allowImageCaption: dto.imageCaption === true,
    allowImages: dto.images === true,
    allowLocation: dto.location === true,
    allowQuickMessages: dto.quickMessages === true,
    allowReactions: dto.reactions === true,
    allowReply: dto.reply === true,
    allowScheduling: dto.scheduling === true,
    allowVehicle: dto.vehicle === true,
    allowVideo: dto.video === true,
    officialWindowNotice:
      dto.officialWindowNotice ?? readProviderWindowNotice(connection.provider),
    provider: connection.provider as CrmWhatsappProvider,
  };
}

function readProviderWindowNotice(provider: string) {
  if (provider === "composio_whatsapp") {
    return "WhatsApp oficial: mensagens livres exigem interação recente do cliente. Fora da janela, inicie com um template aprovado.";
  }
  if (provider === "composio_instagram") {
    return "Instagram oficial: o atendimento só envia texto ou imagem em uma conversa iniciada recentemente pelo cliente.";
  }
  return null;
}

export function readCrmWhatsappSendReadiness(
  connection: CrmWhatsappProviderConnection | null,
  realtimeStatus: CrmWhatsappRealtimeStatus,
) {
  if (!connection) {
    return {
      canSend: false,
      reason: "O canal ainda não foi identificado.",
    };
  }
  const capabilities = connection.capabilities;
  if (!capabilities) {
    return {
      canSend: false,
      reason: "As capacidades deste canal ainda não foram confirmadas.",
    };
  }
  if (capabilities.text !== true) {
    return {
      canSend: false,
      reason: "Este canal não permite envio de texto.",
    };
  }
  if (connection.ready !== true) {
    return {
      canSend: false,
      reason: "O provedor ainda não está pronto para envio.",
    };
  }
  if (connection.live.providerStatus !== "connected") {
    return {
      canSend: false,
      reason: "O canal está offline ou a conexão ainda está sendo verificada.",
    };
  }
  if (realtimeStatus !== "connected") {
    return {
      canSend: false,
      reason:
        realtimeStatus === "degraded"
          ? "A atualização em tempo real está degradada; enviar está bloqueado por segurança."
          : "A conexão em tempo real ainda não está pronta para envio.",
    };
  }
  return { canSend: true, reason: null };
}
