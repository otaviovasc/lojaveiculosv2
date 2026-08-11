import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmWhatsappGateway } from "../ports/crmWhatsappGateway.js";
import type {
  CrmWhatsappMessageSenderType,
  CrmWhatsappMessageSenderOrigin,
  CrmWhatsappMessageType,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";

export type ProviderSentMessage = {
  externalId: string;
  providerTimestamp: Date;
};

export type PreparedOutboundWhatsappMessage = {
  content: string;
  leadActivityContent?: string;
  mediaType?: string;
  mediaUrl?: string;
  metadata: Record<string, unknown>;
  sent: ProviderSentMessage;
  type: CrmWhatsappMessageType;
};

export type SendWhatsappOutboundInput = {
  idempotencyKey?: string;
  idempotencyPayload?: unknown;
  prepare: (input: {
    connection: CrmConnection;
    gateway: CrmWhatsappGateway;
    phone: string;
    scope: { storeId: string; tenantId: string };
    session: CrmWhatsappSession;
  }) => Promise<PreparedOutboundWhatsappMessage>;
  senderOrigin: CrmWhatsappMessageSenderOrigin;
  senderType?: CrmWhatsappMessageSenderType;
  sessionId: string;
};
