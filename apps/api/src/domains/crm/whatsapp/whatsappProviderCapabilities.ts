import type { CrmConnectionProvider } from "../ports/crmConnectionRepository.js";
/** Provider transport abilities for WhatsApp adapter operations. */
export type WhatsappProviderCapabilities = {
  audio: boolean;
  catalog: boolean;
  conversationStart: boolean;
  delete: boolean;
  documents: boolean;
  imageCaption: boolean;
  images: boolean;
  location: boolean;
  quickMessages: boolean;
  reactions: boolean;
  reply: boolean;
  scheduling: boolean;
  templates: boolean;
  text: boolean;
  vehicle: boolean;
  video: boolean;
};

export function providerCapabilities(input: {
  channel: "instagram" | "olx_chat" | "whatsapp";
  provider: CrmConnectionProvider;
}): WhatsappProviderCapabilities {
  if (input.channel === "olx_chat") {
    return {
      audio: false,
      catalog: false,
      conversationStart: false,
      delete: false,
      documents: false,
      imageCaption: false,
      images: false,
      location: false,
      quickMessages: false,
      reactions: false,
      reply: false,
      scheduling: false,
      templates: false,
      text: true,
      vehicle: false,
      video: false,
    };
  }
  if (input.channel === "instagram") {
    return {
      audio: false,
      catalog: false,
      conversationStart: false,
      delete: false,
      documents: false,
      imageCaption: false,
      images: true,
      location: false,
      quickMessages: false,
      reactions: false,
      reply: false,
      scheduling: false,
      templates: false,
      text: true,
      vehicle: false,
      video: false,
    };
  }
  if (input.provider === "meta_cloud") {
    return {
      audio: true,
      catalog: false,
      conversationStart: true,
      delete: false,
      documents: true,
      imageCaption: true,
      images: true,
      location: true,
      quickMessages: true,
      reactions: false,
      reply: true,
      scheduling: false,
      templates: true,
      text: true,
      vehicle: true,
      video: true,
    };
  }
  if (input.provider === "uazapi") {
    return {
      audio: true,
      catalog: false,
      conversationStart: true,
      delete: true,
      documents: true,
      imageCaption: true,
      images: true,
      location: true,
      quickMessages: true,
      reactions: true,
      reply: true,
      scheduling: true,
      templates: false,
      text: true,
      vehicle: true,
      video: true,
    };
  }
  return {
    audio: true,
    catalog: true,
    conversationStart: true,
    delete: true,
    documents: true,
    imageCaption: true,
    images: true,
    location: true,
    quickMessages: true,
    reactions: true,
    reply: true,
    scheduling: true,
    templates: false,
    text: true,
    vehicle: true,
    video: true,
  };
}
