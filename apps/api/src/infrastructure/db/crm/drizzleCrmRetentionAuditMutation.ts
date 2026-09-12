import { crmRetentionAuditOutbox } from "@lojaveiculosv2/db";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import type { DrizzleCrmRetentionMutationInput } from "./drizzleCrmRetentionMutationSupport.js";

export async function enqueueCrmRetentionAudit(
  db: DrizzleCrmClient,
  input: DrizzleCrmRetentionMutationInput,
  affected: number,
): Promise<string | undefined> {
  if (affected === 0) return undefined;
  const [outbox] = await db
    .insert(crmRetentionAuditOutbox)
    .values({
      actorId: input.auditIntent.actorId,
      actorKind: input.auditIntent.actorKind,
      idempotencyKey: input.auditIntent.idempotencyKey,
      metadata: {
        affectedCount: affected,
        dryRun: false,
        eligibleCount: input.candidates.length,
        legalHoldSkipped: input.legalHoldSkipped,
        verified: true,
      },
      occurredAt: input.now,
      requestId: input.auditIntent.requestId,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({ target: crmRetentionAuditOutbox.idempotencyKey })
    .returning({ auditId: crmRetentionAuditOutbox.auditId });
  return outbox?.auditId;
}
