import type {
  CrmWhatsappConnectionId,
  CrmWhatsappMessage,
  CrmWhatsappSession,
  CrmWhatsappSessionId,
} from "./crmWhatsappTypes";
import type { ProductCrmLead } from "./productCrmTypes";

export type CrmWhatsappQuickMessageKind = "AUDIO" | "IMAGE" | "TEXT";

export type CrmWhatsappQuickMessage = {
  content: string;
  createdAt?: string;
  id: string;
  isSystem?: boolean;
  kind: CrmWhatsappQuickMessageKind;
  mediaType?: string | null;
  mediaUrl?: string | null;
  sortOrder?: number;
  shortcut: string;
  title: string;
  updatedAt?: string;
};

export type CrmWhatsappCreateQuickMessageInput = {
  content?: string;
  kind?: CrmWhatsappQuickMessageKind;
  mediaBase64?: string;
  mediaFileName?: string;
  mediaType?: string;
  shortcut: string;
  title: string;
};

export type CrmWhatsappUpdateQuickMessageInput =
  Partial<CrmWhatsappCreateQuickMessageInput>;

export type CrmWhatsappSendQuickMessageInput = {
  quickMessageId: string;
  sessionId: string;
};

export type CrmWhatsappScheduledMessageStatus =
  "cancelled" | "failed" | "pending" | "sending" | "sent";

export type CrmWhatsappScheduledMessage = {
  cancelledAt: string | null;
  connectionId: string;
  createdAt: string;
  createdByUserId: string | null;
  errorMessage: string | null;
  id: string;
  metadata: Record<string, unknown>;
  phone: string;
  scheduledAt: string;
  sentAt: string | null;
  sentMessageId: string | null;
  sessionId: string;
  status: CrmWhatsappScheduledMessageStatus;
  text: string;
  updatedAt: string;
};

export type CrmWhatsappCreateScheduledMessageInput = {
  scheduledAt: string;
  sessionId: string;
  text: string;
};

export type CrmWhatsappListScheduledMessagesInput = {
  connectionId?: CrmWhatsappConnectionId;
  sessionId?: CrmWhatsappSessionId;
  status?: CrmWhatsappScheduledMessageStatus;
};

export type CrmWhatsappProcessDueScheduledMessagesInput = {
  dueAt?: string;
  limit?: number;
};

export type CrmWhatsappProcessDueScheduledMessagesResult = {
  failed: number;
  processed: number;
  sent: number;
};

export type CrmWhatsappStartConversationInput = {
  buyerName?: string;
  connectionId: CrmWhatsappConnectionId;
  leadId?: string;
  phone?: string;
  text: string;
};

export type CrmWhatsappStartConversationResult = {
  lead: ProductCrmLead;
  message: CrmWhatsappMessage;
  session: CrmWhatsappSession;
};

export type CrmWhatsappSendLocationInput = {
  address?: string;
  latitude: number;
  longitude: number;
  name?: string;
  sessionId: string;
  url?: string;
};

export type CrmWhatsappSendCatalogInput = {
  catalogDescription?: string;
  catalogPhone?: string;
  catalogUrl?: string;
  message?: string;
  sessionId: string;
  title?: string;
};

export type CrmWhatsappCatalogProduct = {
  availability?: string | null;
  currency?: string | null;
  description?: string | null;
  id: string;
  images: string[];
  name: string;
  price?: string | null;
  quantity?: number | null;
  retailerId?: string | null;
  salePrice?: string | null;
};

export type CrmWhatsappCatalogProductsPage = {
  cartEnabled?: boolean | null;
  catalogPhone: string;
  nextCursor?: string | null;
  products: CrmWhatsappCatalogProduct[];
};

export type CrmWhatsappListCatalogProductsInput = {
  catalogPhone?: string;
  nextCursor?: string;
  sessionId: string;
};

export type CrmWhatsappListTagsInput = {
  connectionId?: CrmWhatsappConnectionId | null;
  search?: string;
};

export type CrmWhatsappCreateTagInput = {
  color?: string;
  connectionId?: CrmWhatsappConnectionId | null;
  emoji?: string | null;
  name: string;
};

export type CrmWhatsappUpdateTagInput = {
  color?: string;
  emoji?: string | null;
  name?: string;
  sortOrder?: number;
};

export type CrmWhatsappReorderTagsInput = {
  tagIds: string[];
};

export type CrmWhatsappSendCatalogProductInput = {
  catalogPhone?: string;
  productId: string;
  productName?: string;
  sessionId: string;
};

export type CrmWhatsappSendVehicleInput = {
  description?: string;
  listingId?: string;
  mediaLimit?: number;
  mileageLabel?: string;
  priceLabel?: string;
  sessionId: string;
  thumbnailUrl?: string;
  title?: string;
  unitId?: string;
  url?: string;
  year?: string;
};

export type CrmWhatsappVehicleOption = {
  colorName?: string | null;
  listingId: string;
  mediaCount: number;
  mileageLabel?: string | null;
  plate?: string | null;
  priceLabel?: string | null;
  status: string;
  stockNumber?: string | null;
  thumbnailUrl?: string | null;
  title: string;
  unitId?: string | null;
  yearLabel?: string | null;
};

export type CrmWhatsappVehicleQuery = {
  search?: string;
};

export type CrmWhatsappAddSessionTagInput = {
  color?: string;
  emoji?: string | null;
  name: string;
};

export type CrmWhatsappProviderEvent = {
  attentionReason: "processing_failed" | "received_message_ignored" | null;
  connectionId: string | null;
  createdAt: string;
  errorMessage: string | null;
  eventType: string;
  id: string;
  processedAt: string | null;
  providerEventId: string;
  retryable: boolean;
  status: "failed" | "ignored" | "processed" | "received";
  updatedAt: string;
  webhookType:
    | "chat_presence"
    | "connected"
    | "delivery"
    | "disconnected"
    | "received"
    | "status"
    | null;
};

export type CrmWhatsappProviderEventsResponse = {
  events: CrmWhatsappProviderEvent[];
};

export type CrmWhatsappRetryProviderEventResponse = {
  event: CrmWhatsappProviderEvent;
  result: Record<string, unknown>;
};

export type CrmWhatsappRealtimeEvent =
  | { type: "connected" }
  | {
      connectionId: string;
      message: CrmWhatsappMessage;
      session: CrmWhatsappSession;
      type: "message";
    }
  | {
      connectionId: string;
      session: CrmWhatsappSession;
      type: "session";
    }
  | {
      connectionId: string;
      lastCustomerReadAt?: string;
      messageId: CrmWhatsappMessage["id"];
      sessionId: CrmWhatsappSessionId;
      status: CrmWhatsappMessage["status"];
      type: "message_status";
    }
  | {
      connectionId: string;
      phone: string | null;
      status: string;
      type: "connection_status";
    }
  | {
      connectionId: string;
      payload: Record<string, unknown>;
      type: "presence";
    };

export type CrmWhatsappEventsTicket = {
  expiresAt: string;
  ticket: string;
};
