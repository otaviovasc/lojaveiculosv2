import type { CrmChannel, CrmTransportProvider } from "../core/models.js";

export type CanonicalInboundIdentity = {
  kind: "phone" | "provider_subject";
  normalizedValue: string;
};

export type CanonicalInboundMessageInput = {
  channel: CrmChannel;
  connectionCapabilities: {
    inbound: boolean;
    outbound: boolean;
    templates: boolean;
  };
  connectionDisplayName: string;
  connectionId: string;
  contactDisplayName: string | null;
  content: string;
  externalThreadId: string;
  externalThreadAliases: readonly string[];
  identity: CanonicalInboundIdentity;
  occurredAt: Date;
  mediaType: string | null;
  mediaUrl: string | null;
  messageType: string;
  metadata: Readonly<Record<string, unknown>>;
  provider: CrmTransportProvider;
  providerMessageId: string;
  secondaryPhone: string | null;
  sender: "customer" | "system";
  storeId: string;
  tenantId: string;
};

export type CanonicalInboundMessageResult = {
  contactId: string;
  created: boolean;
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
