import { sql } from "drizzle-orm";
import type {
  BillingProductEventLease,
  BillingProductEventOutboxRepository,
} from "../../../domains/billing/ports/billingProductEventDelivery.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export function createDrizzleBillingProductEventOutbox(
  db: DrizzleBillingClient,
): BillingProductEventOutboxRepository {
  return {
    async claimBatch(input) {
      const now = input.now.toISOString();
      const leaseExpiresAt = new Date(
        input.now.getTime() + input.leaseDurationMs,
      ).toISOString();
      const rows = await db.execute(sql`
        with candidates as (
          select id
          from billing_product_event_outbox
          where status = 'pending'
            and next_attempt_at <= ${now}
            and (lease_expires_at is null or lease_expires_at <= ${now})
          order by next_attempt_at, occurred_at, id
          for update skip locked
          limit ${input.limit}
        )
        update billing_product_event_outbox as outbox
        set attempt_count = outbox.attempt_count + 1,
            last_attempt_at = ${now},
            lease_expires_at = ${leaseExpiresAt},
            lease_token = gen_random_uuid()::text,
            updated_at = ${now}
        from candidates
        where outbox.id = candidates.id
        returning outbox.*
      `);
      return asRows(rows).map(toLease);
    },

    async markDelivered(input) {
      const rows = await db.execute(sql`
        update billing_product_event_outbox
        set status = 'processed', processed_at = ${input.deliveredAt.toISOString()},
            failure_code = null, lease_token = null, lease_expires_at = null,
            updated_at = ${input.deliveredAt.toISOString()}
        where id = ${input.eventId}::uuid and lease_token = ${input.leaseToken}
        returning id
      `);
      return asRows(rows).length === 1;
    },

    async markFailed(input) {
      const rows = await db.execute(sql`
        update billing_product_event_outbox
        set status = 'failed', failure_code = ${input.errorCode},
            lease_token = null, lease_expires_at = null,
            updated_at = ${input.failedAt.toISOString()}
        where id = ${input.eventId}::uuid and lease_token = ${input.leaseToken}
        returning id
      `);
      return asRows(rows).length === 1;
    },

    async requeueFailed(input) {
      return db.transaction(async (tx) => {
        const client = tx as DrizzleBillingClient;
        const rows = asRows(
          await client.execute(sql`
            update billing_product_event_outbox
            set status = 'pending', attempt_count = 0,
                requeue_count = requeue_count + 1,
                failure_code = null, processed_at = null,
                lease_token = null, lease_expires_at = null,
                next_attempt_at = ${input.now.toISOString()},
                updated_at = ${input.now.toISOString()}
            where id = ${input.eventId}::uuid
              and tenant_id = ${input.tenantId}::uuid
              and status = 'failed'
            returning event_name, requeue_count, store_id
          `),
        );
        const requeued = rows[0];
        if (requeued) {
          return {
            eventName: String(
              requeued.event_name,
            ) as BillingProductEventLease["eventName"],
            kind: "requeued" as const,
            requeueCount: numberField(requeued, "requeue_count"),
            storeId: nullableString(requeued.store_id),
          };
        }
        const existing = asRows(
          await client.execute(sql`
            select status
            from billing_product_event_outbox
            where id = ${input.eventId}::uuid
              and tenant_id = ${input.tenantId}::uuid
            limit 1
          `),
        )[0];
        if (!existing) return { kind: "not_found" as const };
        return existing.status === "pending"
          ? { kind: "already_pending" as const }
          : { kind: "not_requeueable" as const };
      });
    },

    async scheduleRetry(input) {
      const rows = await db.execute(sql`
        update billing_product_event_outbox
        set failure_code = ${input.errorCode},
            lease_token = null, lease_expires_at = null,
            next_attempt_at = ${input.nextAttemptAt.toISOString()},
            updated_at = ${input.now.toISOString()}
        where id = ${input.eventId}::uuid and lease_token = ${input.leaseToken}
        returning id
      `);
      return asRows(rows).length === 1;
    },

    async snapshot(now) {
      const rows = asRows(
        await db.execute(sql`
          select
            count(*) filter (where status = 'pending')::int as pending_count,
            count(*) filter (where status = 'pending' and attempt_count > 0)::int as retrying_count,
            count(*) filter (where status = 'failed')::int as failed_count,
            coalesce(sum(requeue_count), 0)::int as requeue_count,
            coalesce(extract(epoch from (${now.toISOString()}::timestamptz - min(occurred_at)
              filter (where status = 'pending'))), 0)::int as oldest_pending_age_seconds
          from billing_product_event_outbox
        `),
      );
      const row = rows[0];
      return {
        failedCount: numberField(row, "failed_count"),
        oldestPendingAgeSeconds: numberField(row, "oldest_pending_age_seconds"),
        pendingCount: numberField(row, "pending_count"),
        requeueCount: numberField(row, "requeue_count"),
        retryingCount: numberField(row, "retrying_count"),
      };
    },
  };
}

type RawRow = Record<string, unknown>;

function asRows(value: unknown): RawRow[] {
  return value as RawRow[];
}

function numberField(row: RawRow | undefined, key: string): number {
  const value = row?.[key];
  return typeof value === "number" ? value : Number(value ?? 0);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toLease(row: RawRow): BillingProductEventLease {
  return {
    attemptCount: numberField(row, "attempt_count"),
    eventName: row.event_name as BillingProductEventLease["eventName"],
    hireId: nullableString(row.hire_id),
    id: String(row.id),
    idempotencyKey: String(row.idempotency_key),
    leaseToken: String(row.lease_token),
    occurredAt: new Date(String(row.occurred_at)),
    properties: (row.properties ??
      {}) as BillingProductEventLease["properties"],
    providerCheckoutId: nullableString(row.provider_checkout_id),
    providerEventId: nullableString(row.provider_event_id),
    providerPaymentId: nullableString(row.provider_payment_id),
    providerSubscriptionId: nullableString(row.provider_subscription_id),
    requestId: nullableString(row.request_id),
    storeId: nullableString(row.store_id),
    tenantId: String(row.tenant_id),
  };
}
