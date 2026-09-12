import type { AuditSink } from "@lojaveiculosv2/audit";
import type { BillingAuditOutboxRepository } from "../domains/billing/ports/billingAuditOutbox.js";
import type { ServiceContext } from "../shared/serviceContext.js";

export async function deliverBillingAuditOutbox(input: {
  audit: AuditSink;
  batchSize: number;
  context: ServiceContext;
  leaseDurationMs: number;
  maxAttempts: number;
  now?: Date;
  repository: BillingAuditOutboxRepository;
}) {
  const now = input.now ?? new Date();
  const records = await input.repository.claimBatch({
    leaseDurationMs: input.leaseDurationMs,
    limit: input.batchSize,
    now,
  });
  const result = {
    claimed: records.length,
    deadLettered: 0,
    delivered: 0,
    retried: 0,
  };
  for (const record of records) {
    try {
      await input.audit.record({
        action: record.action,
        actor: { id: record.actorId, kind: record.actorKind },
        category: "data_change",
        criticality: "critical",
        entityId: record.entityId,
        entityType: record.entityType,
        failureTier: "required",
        id: record.auditId,
        metadata: record.metadata,
        occurredAt: record.occurredAt,
        outcome: "succeeded",
        requestId: record.requestId,
        storeId: record.storeId,
        summary: summaryFor(record.action),
        tenantId: record.tenantId,
      });
      const marked = await input.repository.markDelivered({
        deliveredAt: now,
        eventId: record.id,
        leaseToken: record.leaseToken,
      });
      if (marked) result.delivered += 1;
      else
        input.context.logger.warn(
          "billing.audit_outbox.claim_lost",
          auditLog(record),
        );
    } catch {
      const deadLetter = record.attemptCount >= input.maxAttempts;
      const marked = deadLetter
        ? await input.repository.markDeadLetter({
            errorCode: "audit_sink_unavailable",
            eventId: record.id,
            failedAt: now,
            leaseToken: record.leaseToken,
          })
        : await input.repository.scheduleRetry({
            errorCode: "audit_sink_unavailable",
            eventId: record.id,
            leaseToken: record.leaseToken,
            nextAttemptAt: nextAttemptAt(now, record.attemptCount),
            now,
          });
      if (marked && deadLetter) result.deadLettered += 1;
      if (marked && !deadLetter) result.retried += 1;
      input.context.logger[deadLetter ? "error" : "warn"](
        deadLetter
          ? "billing.audit_outbox.dead_lettered"
          : "billing.audit_outbox.retry_scheduled",
        auditLog(record),
      );
    }
  }
  return result;
}

function nextAttemptAt(now: Date, attemptCount: number) {
  const delayMs = Math.min(
    15 * 60_000,
    30_000 * 2 ** Math.max(0, attemptCount - 1),
  );
  return new Date(now.getTime() + delayMs);
}

function summaryFor(action: string) {
  if (action === "billing.plan_hire.activated")
    return "Activated paid billing plan hire";
  if (action === "billing.plan_hire.created")
    return "Persisted billing plan hire";
  if (action === "billing.plan_hire.checkout_created")
    return "Bound billing checkout to plan hire";
  if (action === "billing.plan_quote.requested")
    return "Requested server-owned billing plan quote";
  if (action === "billing.plan_quote.approved")
    return "Approved server-owned billing plan quote";
  return "Applied permanent Free fallback after billing grace period";
}

function auditLog(record: {
  action: string;
  auditId: string;
  id: string;
  storeId: string;
  tenantId: string;
}) {
  return {
    action: record.action,
    auditEventId: record.auditId,
    auditOutboxId: record.id,
    storeId: record.storeId,
    tenantId: record.tenantId,
  };
}
