import { sql } from "drizzle-orm";
import type { CrmPushRepository } from "../../../domains/crm/ports/crmPushRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import {
  asCrmPushRawRows,
  toCrmPushIntent,
  toCrmPushIntentLease,
} from "./drizzleCrmPushSupport.js";

type IntentOperations = Pick<
  CrmPushRepository,
  "claimDeliveryBatch" | "enqueueCurrentGeneration"
>;

export function createCrmPushIntentOperations(
  db: DrizzleCrmClient,
): IntentOperations {
  return {
    async claimDeliveryBatch(input) {
      const rows = await db.execute(sql`
        with candidates as (
          select id from crm_push_notification_outbox
          where (
            (state = 'pending' and next_attempt_at <= ${input.now})
            or (state = 'processing' and lease_expires_at <= ${input.now})
          )
          order by next_attempt_at, created_at
          for update skip locked
          limit ${input.limit}
        )
        update crm_push_notification_outbox as outbox
        set attempt_count = outbox.attempt_count + 1,
          lease_expires_at = ${new Date(input.now.getTime() + input.leaseDurationMs)},
          lease_token = gen_random_uuid(), state = 'processing',
          updated_at = ${input.now}
        from candidates where outbox.id = candidates.id
        returning outbox.*
      `);
      void input.workerId;
      return asCrmPushRawRows(rows).map(toCrmPushIntentLease);
    },

    async enqueueCurrentGeneration(input) {
      const inserted = asCrmPushRawRows(
        await db.execute(sql`
          insert into crm_push_notification_outbox (
            id, tenant_id, store_id, thread_id, cycle_id, message_id,
            generation, idempotency_key, state, attempt_count,
            next_attempt_at, created_at, updated_at
          )
          select gen_random_uuid(), cycle.tenant_id, cycle.store_id,
            cycle.thread_id, cycle.id, message.id,
            cycle.push_notification_generation, ${input.idempotencyKey}::uuid,
            'pending', 0, now(), now(), now()
          from crm_conversation_cycles as cycle
          inner join crm_messages as message
            on message.tenant_id = cycle.tenant_id
            and message.store_id = cycle.store_id
            and message.cycle_id = cycle.id
            and message.thread_id = cycle.thread_id
            and message.id = ${input.messageId}::uuid
          where cycle.tenant_id = ${input.tenantId}::uuid
            and cycle.store_id = ${input.storeId}::uuid
            and cycle.id = ${input.cycleId}::uuid
            and cycle.thread_id = ${input.threadId}::uuid
          on conflict (tenant_id, store_id, cycle_id, generation) do nothing
          returning *
        `),
      )[0];
      if (inserted) {
        return { intent: toCrmPushIntent(inserted), kind: "enqueued" };
      }
      const existing = asCrmPushRawRows(
        await db.execute(sql`
          select outbox.* from crm_push_notification_outbox as outbox
          inner join crm_conversation_cycles as cycle
            on cycle.tenant_id = outbox.tenant_id
            and cycle.store_id = outbox.store_id
            and cycle.id = outbox.cycle_id
            and cycle.push_notification_generation = outbox.generation
          where outbox.tenant_id = ${input.tenantId}::uuid
            and outbox.store_id = ${input.storeId}::uuid
            and outbox.cycle_id = ${input.cycleId}::uuid
          limit 1
        `),
      )[0];
      if (!existing) {
        throw new Error("CRM push intent could not be enqueued for the cycle.");
      }
      return { intent: toCrmPushIntent(existing), kind: "already_claimed" };
    },
  };
}
