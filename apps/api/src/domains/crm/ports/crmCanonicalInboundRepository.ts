import type { CrmChannel, CrmTransportProvider } from "../core/models.js";

export type CanonicalInboundIdentity = {
  kind: "phone" | "provider_subject";
  normalizedValue: string;
};

export type CanonicalInboundMessageInput = {
  channel: CrmChannel;
  connectionId: string;
  contactDisplayName: string | null;
  content: string;
  customerChatId: string | null;
  externalThreadId: string;
  externalThreadAliases: readonly string[];
  identity: CanonicalInboundIdentity;
  leadId: string | null;
  occurredAt: Date;
  mediaType: string | null;
  mediaUrl: string | null;
  messageType: string;
  metadata: Readonly<Record<string, unknown>>;
  provider: CrmTransportProvider;
  providerMessageId: string;
  profilePhotoStorageKey: string | null;
  profilePhotoUrl: string | null;
  secondaryPhone: string | null;
  sender: "customer" | "system";
  senderOrigin: "customer" | "system";
  cycleMetadata: Readonly<Record<string, unknown>>;
  source: string | null;
  storeId: string;
  tenantId: string;
};

export type CanonicalInboundMessageResult = {
  attendanceState:
    | "bot_active"
    | "handback_pending"
    | "handoff_requested"
    | "human_active"
    | "human_claimed";
  contactId: string;
  created: boolean;
  createdConversationCycle: boolean;
  cycleId: string;
  identityId: string;
  messageId: string;
  threadId: string;
};

export type CrmCanonicalInboundRepository = {
  ingestInboundMessage(
    input: CanonicalInboundMessageInput,
  ): Promise<CanonicalInboundMessageResult>;
};
