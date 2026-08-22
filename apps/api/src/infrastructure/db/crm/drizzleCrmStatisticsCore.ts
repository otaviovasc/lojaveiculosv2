import { sql } from "drizzle-orm";
import type { LoadCrmStatisticsInput } from "../../../domains/crm/readModels/crmStatisticsReadModel.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export type CrmStatisticsCoreRow = {
  active_conversations: string | number | null;
  assigned: string | number | null;
  automated_handled_conversations: string | number | null;
  external_ai_outbound: string | number | null;
  average_first_response_ms: string | number | null;
  completed: string | number | null;
  completed_conversations: string | number | null;
  conversations_created: string | number | null;
  first_response_samples: string | number | null;
  fresh: string | number | null;
  human_handled_conversations: string | number | null;
  human_outbound: string | number | null;
  inbound: string | number | null;
  internal_automation_outbound: string | number | null;
  in_human_service: string | number | null;
  scheduled_visits: string | number | null;
  other_outbound: string | number | null;
  unassigned: string | number | null;
  waiting_human: string | number | null;
  won_leads: string | number | null;
};

export async function queryCrmStatisticsCore(
  db: DrizzleCrmClient,
  input: LoadCrmStatisticsInput,
): Promise<CrmStatisticsCoreRow> {
  const rows = await db.execute(sql`
    with scoped_cycles as (
      select cycle.*, thread.provider_connection_id
      from crm_conversation_cycles cycle
      inner join crm_conversation_threads thread on thread.id = cycle.thread_id
      where cycle.tenant_id = ${input.tenantId}::uuid
        and cycle.store_id = ${input.storeId}::uuid
        and (${input.connectionId ?? null}::uuid is null
          or thread.provider_connection_id = ${input.connectionId ?? null}::uuid)
    ), cohort as (
      select * from scoped_cycles
      where created_at >= ${input.from.toISOString()}::timestamptz
        and created_at < ${input.toExclusive.toISOString()}::timestamptz
    ), period_messages as (
      select message.*
      from crm_messages message
      where message.tenant_id = ${input.tenantId}::uuid
        and message.store_id = ${input.storeId}::uuid
        and message.deleted_at is null
        and message.occurred_at >= ${input.from.toISOString()}::timestamptz
        and message.occurred_at < ${input.toExclusive.toISOString()}::timestamptz
        and (${input.connectionId ?? null}::uuid is null
          or message.provider_connection_id = ${input.connectionId ?? null}::uuid)
    ), response_samples as (
      select cohort.id, extract(epoch from (
        cohort.first_handled_at - min(message.occurred_at)
      )) * 1000 as response_ms
      from cohort
      inner join crm_messages message on message.cycle_id = cohort.id
        and message.direction = 'inbound' and message.deleted_at is null
      where cohort.first_handled_at is not null
      group by cohort.id, cohort.first_handled_at
      having cohort.first_handled_at >= min(message.occurred_at)
    ), queue as (
      select
        count(*) filter (where cycle.state = 'active'
          and cycle.assigned_user_id is null and cycle.fresh_lead_at is not null
          and cycle.first_handled_at is null) as fresh,
        count(*) filter (where cycle.state = 'active'
          and cycle.assigned_user_id is null
          and (cycle.fresh_lead_at is null or cycle.first_handled_at is not null)) as unassigned,
        count(*) filter (where cycle.state = 'active'
          and cycle.assigned_user_id is not null) as assigned,
        count(*) filter (where attendance.state in ('handoff_requested', 'human_claimed')) as waiting_human,
        count(*) filter (where attendance.state = 'human_active') as in_human_service,
        count(*) filter (where cycle.state = 'completed') as completed
      from scoped_cycles cycle
      inner join crm_conversation_attendances attendance on attendance.cycle_id = cycle.id
    )
    select
      (select count(*) from cohort) as conversations_created,
      (select count(*) from scoped_cycles where state = 'active') as active_conversations,
      (select count(*) from cohort where state = 'completed') as completed_conversations,
      (select avg(response_ms) from response_samples) as average_first_response_ms,
      (select count(*) from response_samples) as first_response_samples,
      (select count(distinct cycle_id) from period_messages where sender = 'human') as human_handled_conversations,
      (select count(distinct cycle_id) from period_messages where sender = 'bot') as automated_handled_conversations,
      (select count(*) from period_messages where direction = 'inbound') as inbound,
      (select count(*) from period_messages where direction = 'outbound' and sender = 'human') as human_outbound,
      (select count(*) from period_messages where direction = 'outbound'
        and sender = 'bot' and sender_origin = 'external_bot') as external_ai_outbound,
      (select count(*) from period_messages where direction = 'outbound'
        and (sender = 'system' or (sender = 'bot' and sender_origin <> 'external_bot')))
        as internal_automation_outbound,
      (select count(*) from period_messages where direction = 'outbound'
        and sender not in ('human', 'bot', 'system')) as other_outbound,
      (select count(*) from lead_visits visit
        where visit.tenant_id = ${input.tenantId}::uuid
          and visit.store_id = ${input.storeId}::uuid
          and visit.scheduled_at >= ${input.from.toISOString()}::timestamptz
          and visit.scheduled_at < ${input.toExclusive.toISOString()}::timestamptz
          and exists (select 1 from scoped_cycles cycle
            where cycle.metadata->>'leadId' = visit.lead_id::text)) as scheduled_visits,
      (select count(distinct outcome.lead_id) from crm_lead_outcomes outcome
        where outcome.tenant_id = ${input.tenantId}::uuid
          and outcome.store_id = ${input.storeId}::uuid
          and outcome.outcome = 'won' and outcome.result = 'applied'
          and outcome.created_at >= ${input.from.toISOString()}::timestamptz
          and outcome.created_at < ${input.toExclusive.toISOString()}::timestamptz
          and exists (select 1 from scoped_cycles cycle where
            cycle.id = outcome.origin_cycle_id
            or cycle.metadata->>'leadId' = outcome.lead_id::text)) as won_leads,
      queue.*
    from queue
  `);
  const [row] = rows as unknown as CrmStatisticsCoreRow[];
  if (!row) throw new Error("CRM statistics query returned no summary row.");
  return row;
}
