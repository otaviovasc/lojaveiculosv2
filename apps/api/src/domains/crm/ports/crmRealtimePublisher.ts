import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type { CrmQueueVisibility } from "./crmConversationRepository.js";
import type {
  CrmMessage,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";

export type CrmPresencePayload = {
  phone: string;
  state: "available" | "composing" | "paused" | "unavailable";
};

export type CrmRealtimeEvent =
  | {
      connectionId: string;
      message: CrmMessage;
      conversationCycle: CrmConversationCycle;
      storeId: StoreId;
      tenantId: TenantId;
      type: "message";
    }
  | {
      connectionId: string;
      revokedUserId?: UserId;
      conversationCycle: CrmConversationCycle;
      storeId: StoreId;
      tenantId: TenantId;
      type: "conversationCycle";
    }
  | {
      assignedUserId: UserId | null;
      connectionId: string;
      lastCustomerReadAt?: string;
      messageId: string;
      cycleId: string;
      status: string;
      storeId: StoreId;
      tenantId: TenantId;
      type: "message_status";
    }
  | {
      connectionId: string;
      phone: string | null;
      status: string;
      storeId: StoreId;
      tenantId: TenantId;
      type: "connection_status";
    }
  | {
      assignedUserId: UserId | null;
      connectionId: string;
      cycleId: string;
      payload: CrmPresencePayload;
      storeId: StoreId;
      tenantId: TenantId;
      type: "presence";
    };

export type CrmRealtimePublisher = {
  publish: (event: CrmRealtimeEvent) => Promise<void>;
};

export type CrmRealtimeEventEnvelope = {
  createdAt: string;
  event: CrmRealtimeEvent;
  id: string;
};

export type CrmRealtimeSubscription = {
  connectionId?: string | null;
  onEvent: (event: CrmRealtimeEventEnvelope) => void;
  queueVisibility: CrmQueueVisibility;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmRealtimeReplayInput = {
  connectionId?: string | null;
  limit?: number;
  queueVisibility: CrmQueueVisibility;
  sinceEventId?: string | null;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmRealtimeTicket = {
  connectionId?: string | null;
  expiresAt: Date;
  queueVisibility: CrmQueueVisibility;
  sinceEventId?: string | null;
  storeId: StoreId;
  tenantId: TenantId;
  ticket: string;
};

export type CrmRealtimeBroker = CrmRealtimePublisher & {
  issueTicket: (
    input: Omit<CrmRealtimeTicket, "expiresAt" | "ticket">,
  ) => Promise<CrmRealtimeTicket>;
  replay: (
    input: CrmRealtimeReplayInput,
  ) => Promise<CrmRealtimeEventEnvelope[]>;
  resolveTicket: (ticket: string) => Promise<CrmRealtimeTicket | null>;
  subscribe: (subscription: CrmRealtimeSubscription) => () => void;
};

export function createNoopCrmRealtimePublisher(): CrmRealtimePublisher {
  return {
    publish: async () => undefined,
  };
}
