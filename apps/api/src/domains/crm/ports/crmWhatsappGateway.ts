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
  raw: Record<string, unknown>;
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
  raw: Record<string, unknown>;
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
export type CrmWhatsappDeleteMessageResult = {
  raw: Record<string, unknown>;
};

export type CrmWhatsappGateway = {
  deleteMessage: (
    connection: CrmConnection,
    input: CrmWhatsappDeleteMessageInput,
  ) => Promise<CrmWhatsappDeleteMessageResult>;
  getConnectionStatus: (
    connection: CrmConnection,
  ) => Promise<CrmWhatsappProviderStatus>;
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
};

export class CrmWhatsappGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmWhatsappGatewayError";
  }
}
