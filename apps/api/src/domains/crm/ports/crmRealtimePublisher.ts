import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  WhatsappMessage,
  WhatsappSession,
} from "../whatsapp/whatsappModels.js";

export type CrmRealtimeEvent =
  | {
      connectionId: string;
      message: WhatsappMessage;
      session: WhatsappSession;
      storeId: StoreId;
      tenantId: TenantId;
      type: "message";
    }
  | {
      connectionId: string;
      session: WhatsappSession;
      storeId: StoreId;
      tenantId: TenantId;
      type: "session";
    }
  | {
      connectionId: string;
      lastCustomerReadAt?: string;
      messageId: string;
      sessionId: string;
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
      connectionId: string;
      payload: Record<string, unknown>;
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
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmRealtimeReplayInput = {
  connectionId?: string | null;
  limit?: number;
  sinceEventId?: string | null;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmRealtimeTicket = {
  connectionId?: string | null;
  expiresAt: Date;
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
