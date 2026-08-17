import type { CrmConnection } from "./crmConnectionRepository.js";
export type CrmWhatsappProviderConnectionStatus =
  "connected" | "disconnected" | "unknown";

export type CrmWhatsappProviderStatus = {
  checkedAt: Date;
  connected: boolean;
  connectedPhone: string | null;
  providerStatus: CrmWhatsappProviderConnectionStatus;
  smartphoneConnected: boolean | null;
};
export type CrmWhatsappSendTextInput = {
  replyToMessageId?: string;
  phone: string;
  text: string;
};
export type CrmWhatsappSendTextResult = {
  externalId: string;
  providerTimestamp: Date;
};
export type CrmWhatsappSendMediaType = "audio" | "document" | "image" | "video";
export type CrmWhatsappSendMediaInput = {
  asyncProcessing?: boolean;
  caption?: string;
  fileName?: string;
  mediaType: CrmWhatsappSendMediaType;
  mediaUrl: string;
  mimeType?: string;
  phone: string;
};
export type CrmWhatsappSendMediaResult = CrmWhatsappSendTextResult;

export type CrmWhatsappTemplateParameter =
  | {
      currency: {
        amount_1000: number;
        code: string;
        fallback_value: string;
      };
      type: "currency";
    }
  | {
      date_time: {
        calendar?: "GREGORIAN" | undefined;
        day_of_month?: number | undefined;
        day_of_week?: number | undefined;
        fallback_value: string;
        hour?: number | undefined;
        minute?: number | undefined;
        month?: number | undefined;
        year?: number | undefined;
      };
      type: "date_time";
    }
  | {
      document: { id: string } | { link: string };
      type: "document";
    }
  | {
      image: { id: string } | { link: string };
      type: "image";
    }
  | { payload: string; type: "payload" }
  | { text: string; type: "text" }
  | {
      type: "video";
      video: { id: string } | { link: string };
    };

export type CrmWhatsappTemplateComponent =
  | {
      parameters: readonly CrmWhatsappTemplateParameter[];
      type: "body" | "header";
    }
  | {
      index: string;
      parameters: readonly CrmWhatsappTemplateParameter[];
      sub_type: "quick_reply" | "url";
      type: "button";
    };

export type CrmWhatsappSendTemplateInput = {
  components?: readonly CrmWhatsappTemplateComponent[];
  languageCode: string;
  name: string;
  phone: string;
};

export type CrmWhatsappCatalogProduct = {
  availability: string | null;
  currency: string | null;
  description: string | null;
  id: string;
  images: readonly string[];
  name: string;
  price: string | null;
  quantity: number | null;
  retailerId: string | null;
  salePrice: string | null;
};

export type CrmWhatsappCatalogProductsPage = {
  cartEnabled: boolean | null;
  nextCursor: string | null;
  products: readonly CrmWhatsappCatalogProduct[];
};

export type CrmWhatsappListCatalogProductsInput = {
  catalogPhone?: string;
  nextCursor?: string;
};

export type CrmWhatsappSendCatalogInput = {
  catalogDescription?: string;
  catalogPhone: string;
  message?: string;
  phone: string;
  title?: string;
  translation?: "EN" | "PT";
};

export type CrmWhatsappSendProductInput = {
  catalogPhone: string;
  phone: string;
  productId: string;
};

export type CrmWhatsappSendCatalogResult = CrmWhatsappSendTextResult;
export type CrmWhatsappSendProductResult = CrmWhatsappSendTextResult;

export type CrmWhatsappDeleteMessageInput = {
  messageId: string;
  owner: boolean;
  phone: string;
};

export type CrmWhatsappSendReactionInput = {
  messageId: string;
  phone: string;
  reaction: string;
};

export type CrmWhatsappRemoveReactionInput = {
  messageId: string;
  phone: string;
};

export type CrmWhatsappMessageActionResult = CrmWhatsappSendTextResult;
export type CrmWhatsappDeleteMessageResult = { deleted: boolean };
export type CrmWhatsappWebhookRegistration = {
  type: string;
  url: string;
};

export type CrmWhatsappConfigureWebhooksInput = {
  correlationId?: string;
  webhooks: readonly CrmWhatsappWebhookRegistration[];
};

export type CrmWhatsappWebhookConfigResult = {
  error: string | null;
  ok: boolean;
  status: number | null;
  type: string;
  url: string;
  /** True only after the provider reports this exact callback back to us. */
  verified?: boolean;
};

export type CrmWhatsappConfigureWebhooksResult = {
  results: readonly CrmWhatsappWebhookConfigResult[];
};

export type CrmWhatsappGateway = {
  configureWebhooks: (
    connection: CrmConnection,
    input: CrmWhatsappConfigureWebhooksInput,
  ) => Promise<CrmWhatsappConfigureWebhooksResult>;
  deleteMessage: (
    connection: CrmConnection,
    input: CrmWhatsappDeleteMessageInput,
  ) => Promise<CrmWhatsappDeleteMessageResult>;
  disconnectConnection: (connection: CrmConnection) => Promise<{
    disconnected: true;
  }>;
  getConnectionStatus: (
    connection: CrmConnection,
  ) => Promise<CrmWhatsappProviderStatus>;
  getProfilePhotoUrl?: (
    connection: CrmConnection,
    input: { phone: string },
  ) => Promise<string | null>;
  listCatalogProducts: (
    connection: CrmConnection,
    input: CrmWhatsappListCatalogProductsInput,
  ) => Promise<CrmWhatsappCatalogProductsPage>;
  sendCatalog: (
    connection: CrmConnection,
    input: CrmWhatsappSendCatalogInput,
  ) => Promise<CrmWhatsappSendCatalogResult>;
  sendMedia: (
    connection: CrmConnection,
    input: CrmWhatsappSendMediaInput,
  ) => Promise<CrmWhatsappSendMediaResult>;
  sendProduct: (
    connection: CrmConnection,
    input: CrmWhatsappSendProductInput,
  ) => Promise<CrmWhatsappSendProductResult>;
  removeReaction: (
    connection: CrmConnection,
    input: CrmWhatsappRemoveReactionInput,
  ) => Promise<CrmWhatsappMessageActionResult>;
  sendReaction: (
    connection: CrmConnection,
    input: CrmWhatsappSendReactionInput,
  ) => Promise<CrmWhatsappMessageActionResult>;
  sendText: (
    connection: CrmConnection,
    input: CrmWhatsappSendTextInput,
  ) => Promise<CrmWhatsappSendTextResult>;
  sendTemplate: (
    connection: CrmConnection,
    input: CrmWhatsappSendTemplateInput,
  ) => Promise<CrmWhatsappSendTextResult>;
};

export class CrmWhatsappGatewayError extends Error {
  constructor(
    message: string,
    public readonly status: 409 | 429 | 502 = 502,
    public readonly retryAfterSeconds?: number,
    public readonly code:
      | "configuration_error"
      | "provider_unavailable"
      | "provider_rejected"
      | "rate_limited"
      | "request_failed"
      | "timeout" = status === 429 ? "rate_limited" : "provider_rejected",
  ) {
    super(message);
    this.name = "CrmWhatsappGatewayError";
  }
}
export class CrmWhatsappCapabilityError extends CrmWhatsappGatewayError {
  constructor(message: string) {
    super(message, 409);
    this.name = "CrmWhatsappCapabilityError";
  }
}
