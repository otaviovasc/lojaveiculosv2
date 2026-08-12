import {
  assertPermission,
  AuthorizationError,
} from "../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import type {
  CrmRetentionCategoryResult,
  CrmRetentionRepository,
} from "../ports/crmRetentionRepository.js";
import { calculateCrmRetentionCutoffs } from "./crmRetentionPolicy.js";

const retentionPermission = "crm.manage" as const;
const defaultLimit = 100;
const maxLimit = 500;

export type RunCrmRetentionBatchInput = Readonly<{
  cursor?: string;
  dryRun?: boolean;
  limit?: number;
  now?: Date;
}>;

export type RunCrmRetentionBatchResult = Readonly<{
  blockedBy: readonly string[];
  categories: readonly CrmRetentionCategoryResult[];
  cutoffs: ReturnType<typeof calculateCrmRetentionCutoffs>;
  dryRun: boolean;
  legalHoldSkipped: number;
  legacyCoverageGaps: number;
  nextCursor: string | null;
  status: "blocked" | "completed";
  verified: boolean;
}>;

export async function runCrmRetentionBatch(
  context: ServiceContext,
  input: RunCrmRetentionBatchInput,
  repository: CrmRetentionRepository,
): Promise<RunCrmRetentionBatchResult> {
  assertRetentionContext(context);
  const now = input.now ?? new Date();
  const dryRun = input.dryRun ?? true;
  const limit = Math.min(Math.max(input.limit ?? defaultLimit, 1), maxLimit);
  const cutoffs = calculateCrmRetentionCutoffs(now);
  let readiness;
  try {
    readiness = await repository.inspectReadiness({
      storeId: context.storeId,
      tenantId: context.tenantId,
    });
  } catch (error) {
    await recordRetentionFailureAudit(context, dryRun, error);
    throw error;
  }

  if (readiness.unavailableRelations.length > 0) {
    const result: RunCrmRetentionBatchResult = {
      blockedBy: [...readiness.unavailableRelations],
      categories: [],
      cutoffs,
      dryRun,
      legalHoldSkipped: 0,
      legacyCoverageGaps: readiness.legacyCoverageGaps,
      nextCursor: null,
      status: "blocked",
      verified: false,
    };
    await recordRetentionAudit(context, result);
    context.logger.warn(
      "crm.retention.batch.blocked",
      createServiceLogMetadata(context, {
        dryRun,
        unavailableRelationCount: readiness.unavailableRelations.length,
      }),
    );
    return result;
  }

  let processed;
  try {
    processed = await repository.processBatch({
      ...(input.cursor ? { cursor: input.cursor } : {}),
      auditIntent: {
        actorId: context.actor.id,
        actorKind: context.actor.kind,
        idempotencyKey:
          context.request?.idempotencyKey ??
          `${context.requestId}:crm-retention-batch`,
        requestId: context.requestId,
      },
      cutoffs,
      dryRun,
      limit,
      now,
      scope: { storeId: context.storeId, tenantId: context.tenantId },
    });
  } catch (error) {
    await recordRetentionFailureAudit(context, dryRun, error);
    throw error;
  }
  const result: RunCrmRetentionBatchResult = {
    blockedBy: [],
    ...processed,
    cutoffs,
    dryRun,
    legacyCoverageGaps: processed.legacyCoverageGaps,
    status: "completed",
  };
  await recordRetentionAudit(context, result, processed.auditId);
  context.logger.info(
    "crm.retention.batch.completed",
    createServiceLogMetadata(context, {
      affectedCount: processed.categories.reduce(
        (total, category) => total + category.affected,
        0,
      ),
      dryRun,
      eligibleCount: processed.categories.reduce(
        (total, category) => total + category.eligible,
        0,
      ),
      hasNextCursor: processed.nextCursor !== null,
      legalHoldSkipped: processed.legalHoldSkipped,
      legacyCoverageGaps: processed.legacyCoverageGaps,
      verified: processed.verified,
    }),
  );
  return result;
}

function assertRetentionContext(
  context: ServiceContext,
): asserts context is ServiceContext & { storeId: string; tenantId: string } {
  assertPermission(context, retentionPermission);
  if (context.actor.kind !== "system") {
    throw new AuthorizationError("CRM retention requires a system actor.");
  }
  if (!context.tenantId || !context.storeId) {
    throw new AuthorizationError(
      "CRM retention requires an explicit tenant and store scope.",
    );
  }
}

async function recordRetentionAudit(
  context: ServiceContext & { storeId: string; tenantId: string },
  result: RunCrmRetentionBatchResult,
  auditId?: string,
): Promise<void> {
  const affected = result.categories.reduce(
    (total, category) => total + category.affected,
    0,
  );
  const eligible = result.categories.reduce(
    (total, category) => total + category.eligible,
    0,
  );
  await context.audit.record({
    action: "crm.retention.batch.run",
    actor: context.actor,
    category: "data_change",
    entityId: context.storeId,
    entityType: "store",
    ...(auditId ? { id: auditId } : {}),
    metadata: {
      affectedCount: affected,
      dryRun: result.dryRun,
      eligibleCount: eligible,
      legalHoldSkipped: result.legalHoldSkipped,
      legacyCoverageGaps: result.legacyCoverageGaps,
      permission: retentionPermission,
      status: result.status,
      unavailableRelationCount: result.blockedBy.length,
      verified: result.verified,
    },
    outcome: result.status === "blocked" ? "failed" : "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Applied scoped CRM data retention policy",
    tenantId: context.tenantId,
  });
}

async function recordRetentionFailureAudit(
  context: ServiceContext & { storeId: string; tenantId: string },
  dryRun: boolean,
  error: unknown,
): Promise<void> {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  context.logger.error(
    "crm.retention.batch.failed",
    createServiceLogMetadata(context, { dryRun, errorName }),
  );
  await context.audit.record({
    action: "crm.retention.batch.run",
    actor: context.actor,
    category: "data_change",
    entityId: context.storeId,
    entityType: "store",
    metadata: { dryRun, errorName, permission: retentionPermission },
    outcome: "failed",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Failed scoped CRM data retention policy run",
    tenantId: context.tenantId,
  });
}
