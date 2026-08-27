import { sql } from "drizzle-orm";
import type {
  BillingAuditOutboxLease,
  BillingAuditOutboxRepository,
} from "../../../domains/billing/ports/billingAuditOutbox.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export function createDrizzleBillingAuditOutbox(
  db: DrizzleBillingClient,
): BillingAuditOutboxRepository {
  return {
    async claimBatch(input) {
      const now = input.now.toISOString();
      const leaseExpiresAt = new Date(
        input.now.getTime() + input.leaseDurationMs,
      ).toISOString();
      const rows = await db.execute(sql`
        with candidates as (
          select id
          from billing_audit_outbox
          where state in ('pending', 'delivering')
            and next_attempt_at <= ${now}
            and (lease_expires_at is null or lease_expires_at <= ${now})
          order by next_attempt_at, occurred_at, id
          for update skip locked
          limit ${input.limit}
        )
        update billing_audit_outbox outbox
        set state = 'delivering', attempt_count = outbox.attempt_count + 1,
            lease_token = gen_random_uuid()::text,
            lease_expires_at = ${leaseExpiresAt}, updated_at = ${now}
        from candidates
        where outbox.id = candidates.id
        returning outbox.*
      `);
      return asRows(rows).map(toLease);
    },
    async markDeadLetter(input) {
      return mutateClaim(
        db,
        sql`
        update billing_audit_outbox
        set state = 'dead_letter', failure_code = ${input.errorCode},
            lease_token = null, lease_expires_at = null,
            updated_at = ${input.failedAt.toISOString()}
        where id = ${input.eventId}::uuid
          and state = 'delivering' and lease_token = ${input.leaseToken}
        returning id
      `,
      );
    },
    async markDelivered(input) {
      return mutateClaim(
        db,
        sql`
        update billing_audit_outbox
        set state = 'delivered', delivered_at = ${input.deliveredAt.toISOString()},
            failure_code = null, lease_token = null, lease_expires_at = null,
            updated_at = ${input.deliveredAt.toISOString()}
        where id = ${input.eventId}::uuid
          and state = 'delivering' and lease_token = ${input.leaseToken}
        returning id
      `,
      );
    },
    async scheduleRetry(input) {
      return mutateClaim(
        db,
        sql`
        update billing_audit_outbox
        set state = 'pending', failure_code = ${input.errorCode},
            next_attempt_at = ${input.nextAttemptAt.toISOString()},
            lease_token = null, lease_expires_at = null,
            updated_at = ${input.now.toISOString()}
        where id = ${input.eventId}::uuid
          and state = 'delivering' and lease_token = ${input.leaseToken}
        returning id
      `,
      );
    },
  };
}

async function mutateClaim(
  db: DrizzleBillingClient,
  query: ReturnType<typeof sql>,
) {
  return asRows(await db.execute(query)).length === 1;
}

type RawRow = Record<string, unknown>;

function asRows(value: unknown): RawRow[] {
  return value as RawRow[];
}

function toLease(row: RawRow): BillingAuditOutboxLease {
  return {
    action: row.action as BillingAuditOutboxLease["action"],
    actorId: String(row.actor_id),
    actorKind: row.actor_kind as BillingAuditOutboxLease["actorKind"],
    attemptCount: Number(row.attempt_count),
    auditId: String(row.audit_id),
    entityId: String(row.entity_id),
    entityType: row.entity_type as BillingAuditOutboxLease["entityType"],
    id: String(row.id),
    leaseToken: String(row.lease_token),
    metadata: (row.metadata ?? {}) as BillingAuditOutboxLease["metadata"],
    occurredAt: new Date(String(row.occurred_at)),
    requestId: String(row.request_id),
    storeId: String(row.store_id),
    tenantId: String(row.tenant_id),
  };
}
