import type { CrmConnectionProvider } from "../ports/crmConnectionRepository.js";
import type { WhatsappProviderCapabilities } from "./whatsappConnectionModels.js";

export function providerCapabilities(
  provider: CrmConnectionProvider,
): WhatsappProviderCapabilities {
  if (provider === "olx_chat") {
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
  if (provider === "composio_instagram") {
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
  if (provider === "composio_whatsapp") {
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
