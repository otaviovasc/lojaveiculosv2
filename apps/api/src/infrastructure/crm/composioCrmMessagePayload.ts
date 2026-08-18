import type {
  CrmMessagingSendMediaInput,
  CrmWhatsappSendTemplateInput,
  CrmMessagingSendTextInput,
} from "../../domains/crm/ports/crmMessagingGateway.js";
import {
  createMetaMessagesEndpoint,
  unsupportedComposioCapability,
  type ComposioCrmCredentials,
} from "./composioCrmMessagingGatewaySupport.js";
import type { ComposioProxyInput } from "./composioCrmProxyClient.js";

export function createComposioTextRequest(
  credentials: ComposioCrmCredentials,
  input: CrmMessagingSendTextInput,
): ComposioProxyInput {
  return {
    body:
      credentials.channel === "whatsapp"
        ? createWhatsappTextBody(input)
        : createInstagramTextBody(input),
    endpoint: createMetaMessagesEndpoint(credentials),
  };
}

export function createComposioMediaRequest(
  credentials: ComposioCrmCredentials,
  input: CrmMessagingSendMediaInput,
): ComposioProxyInput {
  return {
    body:
      credentials.channel === "whatsapp"
        ? createWhatsappMediaBody(input)
        : createInstagramMediaBody(input),
    endpoint: createMetaMessagesEndpoint(credentials),
  };
}

export function createComposioTemplateRequest(
  credentials: ComposioCrmCredentials,
  input: CrmWhatsappSendTemplateInput,
): ComposioProxyInput {
  if (credentials.channel !== "whatsapp") {
    unsupportedComposioCapability(
      credentials.channel,
      "send WhatsApp template",
    );
  }
  return {
    body: {
      messaging_product: "whatsapp",
      to: input.phone,
      type: "template",
      template: {
        ...(input.components?.length ? { components: input.components } : {}),
        language: { code: input.languageCode },
        name: input.name,
      },
    },
    endpoint: createMetaMessagesEndpoint(credentials),
  };
}

function createWhatsappTextBody(input: CrmMessagingSendTextInput) {
  return {
    ...(input.replyToMessageId
      ? { context: { message_id: input.replyToMessageId } }
      : {}),
    messaging_product: "whatsapp",
    recipient_type: "individual",
    text: {
      body: input.text,
      preview_url: false,
    },
    to: input.phone,
    type: "text",
  };
}

function createInstagramTextBody(input: CrmMessagingSendTextInput) {
  if (input.replyToMessageId) {
    unsupportedComposioCapability("instagram", "reply-to-message context");
  }
  return {
    message: { text: input.text },
    recipient: { id: input.phone },
  };
}

function createWhatsappMediaBody(input: CrmMessagingSendMediaInput) {
  const media = {
    ...(input.caption && input.mediaType !== "audio"
      ? { caption: input.caption }
      : {}),
    ...(input.fileName && input.mediaType === "document"
      ? { filename: input.fileName }
      : {}),
    link: input.mediaUrl,
  };

  return {
    [input.mediaType]: media,
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.phone,
    type: input.mediaType,
  };
}

function createInstagramMediaBody(input: CrmMessagingSendMediaInput) {
  if (input.mediaType !== "image") {
    unsupportedComposioCapability("instagram", `send ${input.mediaType}`);
  }
  if (input.caption) {
    unsupportedComposioCapability(
      "instagram",
      "image caption in a single send",
    );
  }
  return {
    message: {
      attachment: {
        payload: { url: input.mediaUrl },
        type: "image",
      },
    },
    recipient: { id: input.phone },
  };
}
