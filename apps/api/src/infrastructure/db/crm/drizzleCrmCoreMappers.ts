import type {
  contactIdentities,
  contacts,
  consentReceipts,
  conversationAttendances,
  conversationThreads,
  factProposals,
  opportunities,
  providerConnections,
} from "@lojaveiculosv2/db";
import type {
  Connection,
  Consent,
  Contact,
  ContactIdentity,
  Conversation,
  FactProposal,
  Opportunity,
} from "../../../domains/crm/core/models.js";

export function mapContact(row: typeof contacts.$inferSelect): Contact {
  return {
    createdAt: row.createdAt,
    disputed: false,
    displayName: row.displayName ?? "Contato",
    id: row.id,
    mergedIntoContactId: row.mergedIntoContactId,
    revision: row.revision,
    storeId: row.storeId,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt,
  };
}

export function mapIdentity(
  row: typeof contactIdentities.$inferSelect,
  candidateContactIds: readonly string[] = [],
): ContactIdentity {
  return {
    candidateContactIds,
    contactId: row.contactId,
    createdAt: row.createdAt,
    id: row.id,
    kind: row.identityKind,
    normalizedValue: row.normalizedValue,
    revision: row.revision,
    storeId: row.storeId,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt,
    verification: row.state,
  };
}

export function mapOpportunity(
  row: typeof opportunities.$inferSelect,
): Opportunity {
  const metadata = objectValue(row.metadata);
  return {
    commercialIntentConfirmed: true,
    contactId: row.contactId,
    createdAt: row.createdAt,
    id: row.id,
    interests: Array.isArray(metadata.interests)
      ? (metadata.interests as Opportunity["interests"])
      : [],
    pipelineId: stringOrNull(metadata.pipelineId),
    pipelineStageId: stringOrNull(metadata.pipelineStageId),
    revision: row.revision,
    status: row.state,
    storeId: row.storeId,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt,
  };
}

export function mapConnection(
  row: typeof providerConnections.$inferSelect,
): Connection {
  const metadata = objectValue(row.metadata);
  const operational = row.state === "active";
  const degraded = metadata.degraded === true || row.state === "error";
  const capabilities = objectValue(metadata.capabilities);
  return {
    capabilities: {
      inbound: capabilities.inbound === true,
      outbound: capabilities.outbound === true,
      templates: capabilities.templates === true,
    },
    channel: row.channel,
    createdAt: row.createdAt,
    credentialBroker: row.broker,
    degraded,
    errorCode:
      typeof metadata.errorCode === "string" ? metadata.errorCode : null,
    id: row.id,
    operational,
    revision: row.revision,
    storeId: row.storeId,
    tenantId: row.tenantId,
    transportProvider: row.provider,
    updatedAt: row.updatedAt,
  };
}

export function mapConversation(
  thread: typeof conversationThreads.$inferSelect,
  connection: typeof providerConnections.$inferSelect,
  attendance: typeof conversationAttendances.$inferSelect | null,
): Conversation {
  const metadata = objectValue(thread.metadata);
  return {
    attendanceState: attendance?.state ?? "bot_active",
    channel: thread.channel,
    connectionId: thread.providerConnectionId,
    contactId: thread.contactId ?? "",
    createdAt: thread.createdAt,
    id: thread.id,
    pipelineId: stringOrNull(metadata.pipelineId),
    pipelineStageId: stringOrNull(metadata.pipelineStageId),
    revision: thread.revision,
    storeId: thread.storeId,
    tenantId: thread.tenantId,
    threadState: thread.state,
    transportProvider: connection.provider,
    unreadCount:
      typeof metadata.unreadCount === "number" ? metadata.unreadCount : 0,
    updatedAt: thread.updatedAt,
  };
}

export function mapConsent(row: typeof consentReceipts.$inferSelect): Consent {
  return {
    channel: row.channel ?? "whatsapp",
    contactId: row.contactId,
    createdAt: row.createdAt,
    evidence: row.evidenceReference,
    id: row.id,
    identityId: row.identityId,
    occurredAt: row.occurredAt,
    policyVersion: row.policyVersion,
    purpose: row.purpose,
    revision: row.revision,
    source: row.source,
    status: row.state === "granted" ? "opt_in" : "opt_out",
    storeId: row.storeId,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt,
  };
}

export function mapFactProposal(
  row: typeof factProposals.$inferSelect,
): FactProposal {
  return {
    contactId: row.contactId,
    createdAt: row.createdAt,
    facts: objectValue(row.proposedValue),
    id: row.id,
    revision: row.revision,
    status:
      row.state === "pending"
        ? "proposed"
        : row.state === "approved"
          ? "accepted"
          : "rejected",
    storeId: row.storeId,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt,
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
