import { sql } from "drizzle-orm";
import type { ExternalBotDb } from "./drizzleExternalBotShared.js";
import type { AuthorizedExternalBotEffect } from "./drizzleExternalBotEffectRuntime.js";
import { assertExactlyOne } from "./drizzleExternalBotEffectSynchronizationSupport.js";

export async function synchronizeCanonicalHandoff(
  db: ExternalBotDb,
  effect: AuthorizedExternalBotEffect,
  reason: string,
) {
  const changed = await db.execute(sql`
    with inserted_event as (
      insert into crm_conversation_attendance_events
        (actor_id,actor_kind,cycle_id,idempotency_key,intervention_id,
         next_state,previous_state,reason,request_fingerprint,state_version,
         store_id,tenant_id,thread_id)
      select ${effect.integrationId},'bot',attendance.cycle_id,
        ${effect.idempotencyKey},${effect.effectId}::uuid,'handoff_requested',
        attendance.state,${reason},${effect.requestDigest},
        attendance.state_version+1,attendance.store_id,attendance.tenant_id,
        attendance.thread_id
      from crm_conversation_attendances attendance
      where attendance.thread_id=${effect.threadId}::uuid
        and attendance.cycle_id=${effect.canonicalCycleId}::uuid
        and attendance.tenant_id=${effect.tenantId}::uuid
        and attendance.store_id=${effect.storeId}::uuid
        and attendance.state='bot_active'
      on conflict (tenant_id,store_id,cycle_id,idempotency_key) do nothing
      returning *
    ), synchronized_event as (
      select * from inserted_event
      union all
      select event.* from crm_conversation_attendance_events event
      where event.tenant_id=${effect.tenantId}::uuid
        and event.store_id=${effect.storeId}::uuid
        and event.thread_id=${effect.threadId}::uuid
        and event.cycle_id=${effect.canonicalCycleId}::uuid
        and event.idempotency_key=${effect.idempotencyKey}
        and event.actor_id=${effect.integrationId} and event.actor_kind='bot'
        and event.intervention_id=${effect.effectId}::uuid
        and event.previous_state='bot_active'
        and event.next_state='handoff_requested'
        and event.reason=${reason}
        and event.request_fingerprint=${effect.requestDigest}
        and not exists (select 1 from inserted_event)
    ), synchronized_attendance as (
      update crm_conversation_attendances attendance
      set state='handoff_requested',revision=case
          when attendance.state='bot_active' then attendance.revision+1
          else attendance.revision end,
        state_version=synchronized_event.state_version::integer,
        handoff_requested_at=coalesce(attendance.handoff_requested_at,now()),
        intervention_id=${effect.effectId}::uuid,
        changed_at=case when attendance.state='bot_active' then now()
          else attendance.changed_at end,
        updated_at=now()
      from synchronized_event
      where attendance.thread_id=${effect.threadId}::uuid
        and attendance.cycle_id=${effect.canonicalCycleId}::uuid
        and attendance.tenant_id=${effect.tenantId}::uuid
        and attendance.store_id=${effect.storeId}::uuid
        and ((attendance.state='bot_active'
            and synchronized_event.state_version=attendance.state_version+1)
          or (attendance.state='handoff_requested'
            and attendance.state_version=synchronized_event.state_version
            and attendance.intervention_id=${effect.effectId}::uuid))
      returning attendance.id
    )
    update provider_effects current_effect
      set result=current_effect.result || jsonb_build_object(
        'canonicalHandoffSynchronized',true,
        'canonicalCycleId',${effect.canonicalCycleId}::text),
        updated_at=now()
    where current_effect.id=${effect.effectId}::uuid
      and current_effect.tenant_id=${effect.tenantId}::uuid
      and current_effect.store_id=${effect.storeId}::uuid
      and exists (select 1 from synchronized_attendance)
    returning current_effect.id`);
  assertExactlyOne(changed);

  const verified = await db.execute(sql`
    select attendance.id
    from crm_conversation_attendances attendance
    inner join crm_conversation_attendance_events event
      on event.tenant_id=attendance.tenant_id
      and event.store_id=attendance.store_id
      and event.thread_id=attendance.thread_id
      and event.cycle_id=attendance.cycle_id
      and event.state_version=attendance.state_version
    inner join provider_effects current_effect
      on current_effect.id=${effect.effectId}::uuid
      and current_effect.tenant_id=attendance.tenant_id
      and current_effect.store_id=attendance.store_id
      and current_effect.result->>'canonicalHandoffSynchronized'='true'
    where attendance.tenant_id=${effect.tenantId}::uuid
      and attendance.store_id=${effect.storeId}::uuid
      and attendance.thread_id=${effect.threadId}::uuid
      and attendance.cycle_id=${effect.canonicalCycleId}::uuid
      and attendance.state='handoff_requested'
      and attendance.handoff_requested_at is not null
      and attendance.intervention_id=${effect.effectId}::uuid
      and event.idempotency_key=${effect.idempotencyKey}
      and event.actor_id=${effect.integrationId} and event.actor_kind='bot'
      and event.intervention_id=${effect.effectId}::uuid
      and event.previous_state='bot_active'
      and event.next_state='handoff_requested'
      and event.reason=${reason}
      and event.request_fingerprint=${effect.requestDigest}
    limit 2`);
  assertExactlyOne(verified);
}
