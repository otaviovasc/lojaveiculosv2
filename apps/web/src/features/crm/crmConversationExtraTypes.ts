import type { CrmProvider } from "@lojaveiculosv2/shared";
import type {
  CrmConnectionId,
  CrmMessage,
  CrmConversationCycle,
  CrmConversationCycleId,
} from "./crmConversationTypes";
import type { ProductCrmLead } from "./productCrmTypes";

export type CrmQuickMessageKind = "AUDIO" | "IMAGE" | "TEXT";

export type CrmQuickMessage = {
  content: string;
  createdAt?: string;
  id: string;
  isSystem?: boolean;
  kind: CrmQuickMessageKind;
  mediaType?: string | null;
  mediaUrl?: string | null;
  sortOrder?: number;
  shortcut: string;
  title: string;
  updatedAt?: string;
};

export type CrmCreateQuickMessageInput = {
  content?: string;
  kind?: CrmQuickMessageKind;
  mediaBase64?: string;
  mediaFileName?: string;
  mediaType?: string;
  shortcut: string;
  title: string;
};

export type CrmUpdateQuickMessageInput = Partial<CrmCreateQuickMessageInput>;

export type CrmSendQuickMessageInput = {
  idempotencyKey?: string;
  quickMessageId: string;
  cycleId: string;
};

export type CrmScheduledMessageStatus =
  "cancelled" | "failed" | "pending" | "sending" | "sent";

export type CrmScheduledMessage = {
  cancelledAt: string | null;
  connectionId: string;
  createdAt: string;
  createdByUserId: string | null;
  errorMessage: string | null;
  id: string;
  metadata: Record<string, unknown>;
  recipientAddress: string;
  scheduledAt: string;
  sentAt: string | null;
  sentMessageId: string | null;
  cycleId: string;
  status: CrmScheduledMessageStatus;
  content: string;
  updatedAt: string;
};

export type CrmCreateScheduledMessageInput = {
  content: string;
  scheduledAt: string;
  cycleId: string;
};

export type CrmListScheduledMessagesInput = {
  connectionId?: CrmConnectionId;
  limit?: number;
  cycleId?: CrmConversationCycleId;
  status?: CrmScheduledMessageStatus;
};

export type CrmProcessDueScheduledMessagesInput = {
  dueAt?: string;
  limit?: number;
};

export type CrmProcessDueScheduledMessagesResult = {
  failed: number;
  processed: number;
  sent: number;
};

type CrmStartConversationBase = {
  customerDisplayName?: string;
  connectionId: CrmConnectionId;
  leadId?: string;
  phone?: string;
};

export type CrmStartConversationInput = CrmStartConversationBase &
  (
    | {
        template?: never;
        text: string;
      }
    | {
        template: {
          components?: Array<{
            parameters: Array<Record<string, unknown>>;
            type: "body" | "button" | "header";
          }>;
          languageCode: string;
          name: string;
        };
        text?: never;
      }
  );

export type CrmStartConversationResult = {
  lead: ProductCrmLead;
  message: CrmMessage;
  cycle: CrmConversationCycle;
};

export type CrmWhatsappSendLocationInput = {
  address?: string;
  idempotencyKey?: string;
  latitude: number;
  longitude: number;
  name?: string;
  cycleId: string;
  url?: string;
};

export type CrmWhatsappSendCatalogInput = {
  catalogDescription?: string;
  catalogPhone?: string;
  catalogUrl?: string;
  idempotencyKey?: string;
  message?: string;
  cycleId: string;
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
  cycleId: string;
};

export type CrmListTagsInput = {
  connectionId?: CrmConnectionId | null;
  search?: string;
};

export type CrmCreateTagInput = {
  color?: string;
  connectionId?: CrmConnectionId | null;
  emoji?: string | null;
  name: string;
};

export type CrmUpdateTagInput = {
  color?: string;
  emoji?: string | null;
  name?: string;
  sortOrder?: number;
};

export type CrmReorderTagsInput = {
  tagIds: string[];
};

export type CrmWhatsappSendCatalogProductInput = {
  catalogPhone?: string;
  idempotencyKey?: string;
  productId: string;
  productName?: string;
  cycleId: string;
};

export type CrmWhatsappSendVehicleInput = {
  description?: string;
  idempotencyKey?: string;
  listingId?: string;
  mediaLimit?: number;
  mileageLabel?: string;
  priceLabel?: string;
  cycleId: string;
  thumbnailUrl?: string;
  title?: string;
  unitId?: string;
  url?: string;
  year?: string;
};

export type CrmVehicleOption = {
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

export type CrmVehicleQuery = {
  search?: string;
};

export type CrmAddConversationCycleTagInput = {
  color?: string;
  emoji?: string | null;
  name: string;
};

export type CrmProviderEvent = {
  attentionReason: "processing_failed" | "received_message_ignored" | null;
  connectionId: string | null;
  createdAt: string;
  errorMessage: string | null;
  eventType: string;
  id: string;
  processedAt: string | null;
  provider: CrmProvider;
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

export type CrmProviderEventsResponse = {
  events: CrmProviderEvent[];
};

export type CrmRetryProviderEventResponse = {
  event: CrmProviderEvent;
  result: Record<string, unknown>;
};

export type CrmRealtimeEvent =
  | { type: "connected" }
  | {
      connectionId: string;
      message: CrmMessage;
      cycle: CrmConversationCycle;
      type: "message";
    }
  | {
      connectionId: string;
      cycle: CrmConversationCycle;
      type: "cycle";
    }
  | {
      connectionId: string;
      lastCustomerReadAt?: string;
      messageId: CrmMessage["id"];
      cycleId: CrmConversationCycleId;
      status: CrmMessage["status"];
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

export type CrmEventsTicket = {
  expiresAt: string;
  ticket: string;
};
