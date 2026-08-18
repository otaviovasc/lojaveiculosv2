export const crmRetentionCategories = [
  "canonical_message",
  "provider_raw_payload",
  "bot_interaction",
] as const;

export type CrmRetentionCategory = (typeof crmRetentionCategories)[number];

export type CrmRetentionCutoffs = Readonly<{
  botInteractionBefore: Date;
  canonicalMessageBefore: Date;
  providerRawPayloadBefore: Date;
}>;

export type CrmRetentionScope = Readonly<{
  storeId: string;
  tenantId: string;
}>;

export type CrmRetentionReadiness = Readonly<{
  unavailableRelations: readonly string[];
}>;

export type CrmRetentionScopeClaim = CrmRetentionScope &
  Readonly<{ cursor?: string }>;

export type ProcessCrmRetentionBatchInput = Readonly<{
  auditIntent: CrmRetentionAuditIntent;
  cursor?: string;
  cutoffs: CrmRetentionCutoffs;
  dryRun: boolean;
  limit: number;
  now: Date;
  scope: CrmRetentionScope;
}>;

export type CrmRetentionAuditIntent = Readonly<{
  actorId: string;
  actorKind: "integration" | "public" | "system" | "user";
  idempotencyKey: string;
  requestId: string;
}>;

export type CrmRetentionAuditOutboxRecord = CrmRetentionScope &
  Readonly<{
    actorId: string;
    actorKind: CrmRetentionAuditIntent["actorKind"];
    affectedCount: number;
    auditId: string;
    dryRun: false;
    eligibleCount: number;
    id: string;
    legalHoldSkipped: number;
    occurredAt: Date;
    requestId: string;
    verified: boolean;
  }>;

export type CrmRetentionCategoryResult = Readonly<{
  action: "anonymize" | "purge";
  affected: number;
  category: CrmRetentionCategory;
  eligible: number;
}>;

export type ProcessCrmRetentionBatchResult = Readonly<{
  auditId?: string;
  categories: readonly CrmRetentionCategoryResult[];
  legalHoldSkipped: number;
  nextCursor: string | null;
  verified: boolean;
}>;

/**
 * The adapter owns scoped candidate selection, legal-hold exclusion and the
 * atomic mutation/verification boundary. It must never return message bodies,
 * provider payloads or bot request/response data.
 */
export interface CrmRetentionRepository {
  claimAuditOutbox(input: {
    leaseExpiresAt: Date;
    leaseOwner: string;
    limit: number;
    now: Date;
  }): Promise<readonly CrmRetentionAuditOutboxRecord[]>;
  claimScopes(input: {
    leaseExpiresAt: Date;
    leaseOwner: string;
    limit: number;
    now: Date;
    storeId?: string;
    tenantId?: string;
  }): Promise<readonly CrmRetentionScopeClaim[]>;
  completeScope(
    input: CrmRetentionScope & {
      cursor?: string;
      leaseOwner: string;
      nextRunAt: Date;
      now: Date;
      succeeded: boolean;
    },
  ): Promise<boolean>;
  inspectReadiness(scope: CrmRetentionScope): Promise<CrmRetentionReadiness>;
  markAuditOutbox(input: {
    id: string;
    leaseOwner: string;
    nextAttemptAt: Date;
    now: Date;
    succeeded: boolean;
  }): Promise<boolean>;
  processBatch(
    input: ProcessCrmRetentionBatchInput,
  ): Promise<ProcessCrmRetentionBatchResult>;
}
