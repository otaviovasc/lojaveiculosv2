import type { CrmWhatsappProvider } from "./crmWhatsappTypes";

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

const ZAPI_CAPABILITIES: CrmWhatsappProviderCapabilities = {
  allowAudio: true,
  allowCatalog: true,
  allowDelete: true,
  allowDocuments: true,
  allowImageCaption: true,
  allowImages: true,
  allowLocation: true,
  allowQuickMessages: true,
  allowReactions: true,
  allowReply: true,
  allowScheduling: true,
  allowVehicle: true,
  allowVideo: true,
  officialWindowNotice: null,
  provider: "zapi",
};

const OFFICIAL_WHATSAPP_CAPABILITIES: CrmWhatsappProviderCapabilities = {
  ...ZAPI_CAPABILITIES,
  allowCatalog: false,
  allowDelete: false,
  allowReactions: false,
  allowScheduling: false,
  officialWindowNotice:
    "WhatsApp oficial: mensagens livres exigem interação recente do cliente. Fora da janela, inicie com um template aprovado.",
  provider: "composio_whatsapp",
};

const OFFICIAL_INSTAGRAM_CAPABILITIES: CrmWhatsappProviderCapabilities = {
  ...ZAPI_CAPABILITIES,
  allowAudio: false,
  allowCatalog: false,
  allowDelete: false,
  allowDocuments: false,
  allowImageCaption: false,
  allowLocation: false,
  allowQuickMessages: false,
  allowReactions: false,
  allowReply: false,
  allowScheduling: false,
  allowVehicle: false,
  allowVideo: false,
  officialWindowNotice:
    "Instagram oficial: o atendimento só envia texto ou imagem em uma conversa iniciada recentemente pelo cliente.",
  provider: "composio_instagram",
};

export function readCrmWhatsappProviderCapabilities(
  provider: string | null | undefined,
): CrmWhatsappProviderCapabilities {
  if (provider === "composio_whatsapp") {
    return OFFICIAL_WHATSAPP_CAPABILITIES;
  }
  if (provider === "composio_instagram") {
    return OFFICIAL_INSTAGRAM_CAPABILITIES;
  }
  return ZAPI_CAPABILITIES;
}
