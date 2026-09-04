export const CRM_CHANNELS = ["instagram", "olx_chat", "whatsapp"] as const;
export type CrmChannel = (typeof CRM_CHANNELS)[number];

export const CRM_TRANSPORT_PROVIDERS = [
  "meta_cloud",
  "olx",
  "uazapi",
  "zapi",
] as const;
export type CrmTransportProvider = (typeof CRM_TRANSPORT_PROVIDERS)[number];

export const CRM_CREDENTIAL_BROKERS = ["composio", "direct"] as const;
export type CrmCredentialBroker = (typeof CRM_CREDENTIAL_BROKERS)[number];

export const CRM_ACQUISITION_SOURCES = [
  "manual",
  "meta_ad",
  "mobiauto",
  "olx",
  "site",
] as const;
export type CrmAcquisitionSource = (typeof CRM_ACQUISITION_SOURCES)[number];

export type CrmCoreScope = { storeId: string; tenantId: string };
export type CrmCoreRecord = CrmCoreScope & {
  createdAt: Date;
  id: string;
  revision: number;
  updatedAt: Date;
};

export type Contact = CrmCoreRecord & {
  displayName: string;
  disputed: boolean;
  mergedIntoContactId: string | null;
};

export type ContactIdentityKind =
  "chat_lid" | "email" | "phone" | "provider_subject";
export type IdentityVerification =
  "candidate" | "disputed" | "observed" | "superseded" | "verified";
export type ContactIdentity = CrmCoreRecord & {
  candidateContactIds: readonly string[];
  contactId: string | null;
  kind: ContactIdentityKind;
  normalizedValue: string;
  verification: IdentityVerification;
};

export type OpportunityInterest = {
  kind: "listing" | "model" | "other";
  referenceId?: string | undefined;
  title: string;
};
export type Opportunity = CrmCoreRecord & {
  commercialIntentConfirmed: true;
  contactId: string;
  interests: readonly OpportunityInterest[];
  pipelineId: string | null;
  pipelineStageId: string | null;
  status: "cancelled" | "lost" | "open" | "won";
};

export type Conversation = CrmCoreRecord & {
  attendanceState:
    | "bot_active"
    | "handback_pending"
    | "handoff_requested"
    | "human_active"
    | "human_claimed";
  channel: CrmChannel;
  connectionId: string;
  contactId: string;
  pipelineId: string | null;
  pipelineStageId: string | null;
  threadState: "archived" | "open" | "resolved";
  transportProvider: CrmTransportProvider;
  unreadCount: number;
};

export type ConnectionCapabilities = {
  inbound: boolean;
  outbound: boolean;
  templates: boolean;
};
export type Connection = CrmCoreRecord & {
  capabilities: ConnectionCapabilities;
  channel: CrmChannel;
  credentialBroker: CrmCredentialBroker;
  degraded: boolean;
  errorCode: string | null;
  operational: boolean;
  transportProvider: CrmTransportProvider;
};

export type Consent = CrmCoreRecord & {
  channel: CrmChannel;
  contactId: string;
  evidence: string;
  identityId: string | null;
  occurredAt: Date;
  policyVersion: string;
  purpose: string;
  source: CrmAcquisitionSource;
  status: "opt_in" | "opt_out";
};

export type FactProposal = CrmCoreRecord & {
  contactId: string;
  facts: Readonly<Record<string, unknown>>;
  status: "accepted" | "disputed" | "proposed" | "rejected";
};

export type CrmCoreResource =
  | "connections"
  | "consents"
  | "contact-identities"
  | "contacts"
  | "conversations"
  | "fact-proposals"
  | "opportunities";

export type CrmCoreEntityByResource = {
  connections: Connection;
  consents: Consent;
  "contact-identities": ContactIdentity;
  contacts: Contact;
  conversations: Conversation;
  "fact-proposals": FactProposal;
  opportunities: Opportunity;
};

export type CreateCrmCoreEntity<R extends CrmCoreResource> = Omit<
  CrmCoreEntityByResource[R],
  keyof CrmCoreRecord
>;
