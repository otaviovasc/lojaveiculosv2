import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmMessagingGateway } from "../ports/crmMessagingGateway.js";
import type {
  CrmMessageSenderType,
  CrmMessageSenderOrigin,
  CrmMessageType,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";
import type { CrmRoutingCapability } from "../services/CrmRoutingService/routingReadModels.js";

export type ProviderSentMessage = {
  externalId: string;
  providerTimestamp: Date;
};

export type PreparedOutboundCrmMessage = {
  content: string;
  leadActivityContent?: string;
  mediaType?: string;
  mediaUrl?: string;
  metadata: Record<string, unknown>;
  sent: ProviderSentMessage;
  type: CrmMessageType;
};

export type SendOutboundMessageInput = {
  idempotencyKey?: string;
  idempotencyPayload?: unknown;
  prepare: (input: {
    connection: CrmConnection;
    gateway: CrmMessagingGateway;
    phone: string;
    scope: { storeId: string; tenantId: string };
    conversationCycle: CrmConversationCycle;
  }) => Promise<PreparedOutboundCrmMessage>;
  requiredCapabilities?: readonly CrmRoutingCapability[];
  senderOrigin: CrmMessageSenderOrigin;
  senderType?: CrmMessageSenderType;
  cycleId: string;
};
