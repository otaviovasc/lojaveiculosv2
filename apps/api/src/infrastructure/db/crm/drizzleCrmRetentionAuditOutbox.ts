import { sql } from "drizzle-orm";
import type {
  CrmRetentionAuditOutboxRecord,
  CrmRetentionRepository,
} from "../../../domains/crm/ports/crmRetentionRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function claimDrizzleCrmRetentionAuditOutbox(
  db: DrizzleCrmClient,
  input: Parameters<CrmRetentionRepository["claimAuditOutbox"]>[0],
): Promise<readonly CrmRetentionAuditOutboxRecord[]> {
  const rows = await db.execute(sql`
    with candidates as (
      select id
      from crm_retention_audit_outbox
      where state in ('pending', 'delivering')
        and next_attempt_at <= ${input.now.toISOString()}
        and (lease_expires_at is null or lease_expires_at <= ${input.now.toISOString()})
      order by next_attempt_at, created_at, id
      for update skip locked
      limit ${input.limit}
    )
    update crm_retention_audit_outbox outbox
    set state = 'delivering',
        lease_owner = ${input.leaseOwner},
        lease_expires_at = ${input.leaseExpiresAt.toISOString()},
        attempt_count = attempt_count + 1,
        updated_at = ${input.now.toISOString()}
    from candidates
    where outbox.id = candidates.id
    returning outbox.*
  `);
  return (
    rows as unknown as Array<{
      actor_id: string;
      actor_kind: "integration" | "public" | "system" | "user";
      audit_id: string;
      id: string;
      metadata: Record<string, unknown>;
      occurred_at: Date | string;
      request_id: string;
      store_id: string;
      tenant_id: string;
    }>
  ).map((row) => ({
    actorId: row.actor_id,
    actorKind: row.actor_kind,
    affectedCount: numberMetadata(row.metadata, "affectedCount"),
    auditId: row.audit_id,
    dryRun: false,
    eligibleCount: numberMetadata(row.metadata, "eligibleCount"),
    id: row.id,
    legalHoldSkipped: numberMetadata(row.metadata, "legalHoldSkipped"),
    occurredAt: new Date(row.occurred_at),
    requestId: row.request_id,
    storeId: row.store_id,
    tenantId: row.tenant_id,
    verified: row.metadata.verified === true,
  }));
}

export async function markDrizzleCrmRetentionAuditOutbox(
  db: DrizzleCrmClient,
  input: Parameters<CrmRetentionRepository["markAuditOutbox"]>[0],
): Promise<boolean> {
  const rows = await db.execute(sql`
    update crm_retention_audit_outbox
    set state = case when ${input.succeeded} then 'delivered' else 'pending' end,
        next_attempt_at = ${input.nextAttemptAt.toISOString()},
        lease_owner = null,
        lease_expires_at = null,
        updated_at = ${input.now.toISOString()}
    where id = ${input.id}::uuid
      and lease_owner = ${input.leaseOwner}
    returning id
  `);
  return (rows as unknown as unknown[]).length === 1;
}

function numberMetadata(
  metadata: Record<string, unknown>,
  key: string,
): number {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
