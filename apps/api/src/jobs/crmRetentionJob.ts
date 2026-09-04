import type { AuditSink } from "@lojaveiculosv2/audit";
import type { ServiceContext } from "../shared/serviceContext.js";
import type {
  CrmRetentionRepository,
  CrmRetentionScope,
} from "../domains/crm/ports/crmRetentionRepository.js";
import { runCrmRetentionBatch } from "../domains/crm/retention/runCrmRetentionBatch.js";

export type CrmRetentionJobConfig = Readonly<{
  batchSize: number;
  dryRun: boolean;
  leaseSeconds: number;
  maxBatchesPerScope: number;
  scopeLimit: number;
  storeId?: string;
  tenantId?: string;
}>;

export async function deliverCrmRetentionAuditOutbox(input: {
  audit: AuditSink;
  leaseOwner: string;
  limit: number;
  now?: Date;
  repository: CrmRetentionRepository;
}) {
  const now = input.now ?? new Date();
  const records = await input.repository.claimAuditOutbox({
    leaseExpiresAt: new Date(now.getTime() + 5 * 60 * 1_000),
    leaseOwner: input.leaseOwner,
    limit: input.limit,
    now,
  });
  let delivered = 0;
  let failed = 0;
  for (const record of records) {
    let succeeded = false;
    try {
      await input.audit.record({
        action: "crm.retention.batch.run",
        actor: { id: record.actorId, kind: record.actorKind },
        category: "data_change",
        entityId: record.storeId,
        entityType: "store",
        id: record.auditId,
        metadata: {
          affectedCount: record.affectedCount,
          dryRun: false,
          eligibleCount: record.eligibleCount,
          legalHoldSkipped: record.legalHoldSkipped,
          permission: "crm.manage",
          status: "completed",
          verified: record.verified,
        },
        occurredAt: record.occurredAt,
        outcome: "succeeded",
        requestId: record.requestId,
        storeId: record.storeId,
        summary: "Applied scoped CRM data retention policy",
        tenantId: record.tenantId,
      });
      delivered += 1;
      succeeded = true;
    } catch {
      failed += 1;
    }
    const marked = await input.repository.markAuditOutbox({
      id: record.id,
      leaseOwner: input.leaseOwner,
      nextAttemptAt: new Date(now.getTime() + (succeeded ? 0 : 60_000)),
      now,
      succeeded,
    });
    if (!marked && succeeded) {
      delivered -= 1;
      failed += 1;
    }
  }
  return { claimed: records.length, delivered, failed };
}

export async function executeCrmRetentionJob(input: {
  config: CrmRetentionJobConfig;
  context: (scope: CrmRetentionScope, batch: number) => ServiceContext;
  leaseOwner: string;
  now?: Date;
  repository: CrmRetentionRepository;
}) {
  const now = input.now ?? new Date();
  const scopes = await input.repository.claimScopes({
    leaseExpiresAt: new Date(now.getTime() + input.config.leaseSeconds * 1_000),
    leaseOwner: input.leaseOwner,
    limit: input.config.scopeLimit,
    now,
    ...(input.config.storeId ? { storeId: input.config.storeId } : {}),
    ...(input.config.tenantId ? { tenantId: input.config.tenantId } : {}),
  });
  const total = {
    affected: 0,
    batches: 0,
    blocked: 0,
    dryRun: input.config.dryRun,
    eligible: 0,
    failed: 0,
    legalHoldSkipped: 0,
    scopes: scopes.length,
    truncated: 0,
  };

  for (const scope of scopes) {
    let cursor = scope.cursor;
    let batch = 0;
    let succeeded = true;
    try {
      while (batch < input.config.maxBatchesPerScope) {
        const result = await runCrmRetentionBatch(
          input.context(scope, batch + 1),
          {
            ...(cursor ? { cursor } : {}),
            dryRun: input.config.dryRun,
            limit: input.config.batchSize,
            now,
          },
          input.repository,
        );
        batch += 1;
        total.batches += 1;
        total.affected += sum(result.categories, "affected");
        total.eligible += sum(result.categories, "eligible");
        total.legalHoldSkipped += result.legalHoldSkipped;
        cursor = result.nextCursor ?? undefined;
        if (result.status === "blocked") {
          total.blocked += 1;
          succeeded = false;
          break;
        }
        if (!cursor) break;
      }
      if (cursor && batch >= input.config.maxBatchesPerScope) {
        total.truncated += 1;
      }
    } catch {
      total.failed += 1;
      succeeded = false;
    }
    const completed = await input.repository.completeScope({
      ...(cursor ? { cursor } : {}),
      leaseOwner: input.leaseOwner,
      nextRunAt: nextRunAt(now, succeeded, cursor !== undefined),
      now,
      storeId: scope.storeId,
      succeeded,
      tenantId: scope.tenantId,
    });
    if (!completed) total.failed += 1;
  }
  return total;
}

export function readCrmRetentionJobConfig(
  env: Record<string, string | undefined>,
): CrmRetentionJobConfig {
  const tenantId = optionalValue(env.CRM_RETENTION_TENANT_ID);
  const storeId = optionalValue(env.CRM_RETENTION_STORE_ID);
  if (storeId && !tenantId) {
    throw new Error("CRM_RETENTION_STORE_ID requires CRM_RETENTION_TENANT_ID.");
  }
  return {
    batchSize: readBoundedInteger(env.CRM_RETENTION_BATCH_SIZE, 100, 500),
    dryRun: env.CRM_RETENTION_DRY_RUN?.trim().toLowerCase() !== "false",
    leaseSeconds: readBoundedInteger(
      env.CRM_RETENTION_LEASE_SECONDS,
      900,
      3_600,
    ),
    maxBatchesPerScope: readBoundedInteger(
      env.CRM_RETENTION_MAX_BATCHES,
      20,
      1_000,
    ),
    scopeLimit: readBoundedInteger(env.CRM_RETENTION_SCOPE_LIMIT, 100, 1_000),
    ...(storeId ? { storeId } : {}),
    ...(tenantId ? { tenantId } : {}),
  };
}

function nextRunAt(now: Date, succeeded: boolean, truncated: boolean): Date {
  if (truncated) return now;
  return new Date(now.getTime() + (succeeded ? 24 * 60 : 5) * 60 * 1_000);
}

function optionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && !normalized.startsWith("${{") ? normalized : undefined;
}

function readBoundedInteger(
  value: string | undefined,
  fallback: number,
  maximum: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
}

function sum(
  categories: readonly { affected: number; eligible: number }[],
  field: "affected" | "eligible",
): number {
  return categories.reduce((total, category) => total + category[field], 0);
}
