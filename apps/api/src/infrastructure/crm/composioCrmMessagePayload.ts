import type {
  CrmWhatsappSendMediaInput,
  CrmWhatsappSendTemplateInput,
  CrmWhatsappSendTextInput,
} from "../../domains/crm/ports/crmWhatsappGateway.js";
import {
  createMetaMessagesEndpoint,
  unsupportedComposioCapability,
  type ComposioCrmCredentials,
} from "./composioCrmWhatsappGatewaySupport.js";
import type { ComposioProxyInput } from "./composioCrmProxyClient.js";

export function createComposioTextRequest(
  credentials: ComposioCrmCredentials,
  input: CrmWhatsappSendTextInput,
): ComposioProxyInput {
  return {
    body:
      credentials.provider === "composio_whatsapp"
        ? createWhatsappTextBody(input)
        : createInstagramTextBody(input),
    endpoint: createMetaMessagesEndpoint(credentials),
  };
}

export function createComposioMediaRequest(
  credentials: ComposioCrmCredentials,
  input: CrmWhatsappSendMediaInput,
): ComposioProxyInput {
  return {
    body:
      credentials.provider === "composio_whatsapp"
        ? createWhatsappMediaBody(input)
        : createInstagramMediaBody(input),
    endpoint: createMetaMessagesEndpoint(credentials),
  };
}

export function createComposioTemplateRequest(
  credentials: ComposioCrmCredentials,
  input: CrmWhatsappSendTemplateInput,
): ComposioProxyInput {
  if (credentials.provider !== "composio_whatsapp") {
    unsupportedComposioCapability(
      credentials.provider,
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

function createWhatsappTextBody(input: CrmWhatsappSendTextInput) {
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

function createInstagramTextBody(input: CrmWhatsappSendTextInput) {
  if (input.replyToMessageId) {
    unsupportedComposioCapability(
      "composio_instagram",
      "reply-to-message context",
    );
  }
  return {
    message: { text: input.text },
    recipient: { id: input.phone },
  };
}

function createWhatsappMediaBody(input: CrmWhatsappSendMediaInput) {
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

function createInstagramMediaBody(input: CrmWhatsappSendMediaInput) {
  if (input.mediaType !== "image") {
    unsupportedComposioCapability(
      "composio_instagram",
      `send ${input.mediaType}`,
    );
  }
  if (input.caption) {
    unsupportedComposioCapability(
      "composio_instagram",
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
