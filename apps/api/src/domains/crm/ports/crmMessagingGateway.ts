import type { CrmConnection } from "./crmConnectionRepository.js";
import type { CrmWhatsappSendTemplateInput } from "./crmMessagingGatewayTypes.js";
export type CrmMessagingProviderConnectionStatus =
  "connected" | "disconnected" | "unknown";
export type CrmMessagingProviderStatus = {
  checkedAt: Date;
  connected: boolean;
  connectedPhone: string | null;
  providerStatus: CrmMessagingProviderConnectionStatus;
  smartphoneConnected: boolean | null;
};
export type CrmMessagingSendTextInput = {
  replyToMessageId?: string;
  phone: string;
  text: string;
};
export type CrmMessagingSendTextResult = {
  externalId: string;
  providerTimestamp: Date;
};
export type CrmMessagingSendMediaType =
  "audio" | "document" | "image" | "video";
export type CrmMessagingSendMediaInput = {
  asyncProcessing?: boolean;
  caption?: string;
  fileName?: string;
  mediaType: CrmMessagingSendMediaType;
  mediaUrl: string;
  mimeType?: string;
  phone: string;
  /** Provider (WhatsApp) message id of the quoted message, when replying. */
  replyToMessageId?: string;
};
export type CrmMessagingSendMediaResult = CrmMessagingSendTextResult;

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

export type CrmWhatsappSendCatalogResult = CrmMessagingSendTextResult;
export type CrmWhatsappSendProductResult = CrmMessagingSendTextResult;

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

export type CrmMessageActionResult = CrmMessagingSendTextResult;
export type CrmWhatsappDeleteMessageResult = { deleted: boolean };
export type CrmMessagingWebhookRegistration = {
  type: string;
  url: string;
};

export type CrmMessagingConfigureWebhooksInput = {
  correlationId?: string;
  webhooks: readonly CrmMessagingWebhookRegistration[];
};

export type CrmMessagingWebhookConfigResult = {
  error: string | null;
  ok: boolean;
  status: number | null;
  type: string;
  url: string;
  /** True only after the provider reports this exact callback back to us. */
  verified?: boolean;
};

export type CrmMessagingConfigureWebhooksResult = {
  results: readonly CrmMessagingWebhookConfigResult[];
};

export type CrmMessagingGateway = {
  configureWebhooks: (
    connection: CrmConnection,
    input: CrmMessagingConfigureWebhooksInput,
  ) => Promise<CrmMessagingConfigureWebhooksResult>;
  deleteMessage: (
    connection: CrmConnection,
    input: CrmWhatsappDeleteMessageInput,
  ) => Promise<CrmWhatsappDeleteMessageResult>;
  disconnectConnection: (connection: CrmConnection) => Promise<{
    disconnected: true;
  }>;
  /**
   * Optional inbound-media hydration seam: providers whose webhook payloads do
   * not carry a downloadable file URL (uazapi) resolve it through a provider
   * download endpoint. Absent for providers that do not need it.
   */
  downloadInboundMedia?: (
    connection: CrmConnection,
    input: { messageId: string },
  ) => Promise<{ mediaUrl: string | null; mimeType: string | null }>;
  getConnectionStatus: (
    connection: CrmConnection,
  ) => Promise<CrmMessagingProviderStatus>;
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
    input: CrmMessagingSendMediaInput,
  ) => Promise<CrmMessagingSendMediaResult>;
  sendProduct: (
    connection: CrmConnection,
    input: CrmWhatsappSendProductInput,
  ) => Promise<CrmWhatsappSendProductResult>;
  removeReaction: (
    connection: CrmConnection,
    input: CrmWhatsappRemoveReactionInput,
  ) => Promise<CrmMessageActionResult>;
  sendReaction: (
    connection: CrmConnection,
    input: CrmWhatsappSendReactionInput,
  ) => Promise<CrmMessageActionResult>;
  sendText: (
    connection: CrmConnection,
    input: CrmMessagingSendTextInput,
  ) => Promise<CrmMessagingSendTextResult>;
  sendTemplate: (
    connection: CrmConnection,
    input: CrmWhatsappSendTemplateInput,
  ) => Promise<CrmMessagingSendTextResult>;
};

export class CrmMessagingGatewayError extends Error {
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
    this.name = "CrmMessagingGatewayError";
  }
}
export class CrmMessagingCapabilityError extends CrmMessagingGatewayError {
  constructor(message: string) {
    super(message, 409);
    this.name = "CrmMessagingCapabilityError";
  }
}
