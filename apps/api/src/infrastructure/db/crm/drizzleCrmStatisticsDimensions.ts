import { sql } from "drizzle-orm";
import type { LoadCrmStatisticsInput } from "../../../domains/crm/readModels/crmStatisticsReadModel.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export async function queryCrmStatisticsBreakdowns(
  db: DrizzleCrmClient,
  input: LoadCrmStatisticsInput,
) {
  const rows = await db.execute(sql`
    select coalesce(thread.source, 'unknown') as source, thread.channel,
      count(*) as conversation_count
    from crm_conversation_cycles cycle
    inner join crm_conversation_threads thread on thread.id = cycle.thread_id
    where cycle.tenant_id = ${input.tenantId}::uuid
      and cycle.store_id = ${input.storeId}::uuid
      and cycle.created_at >= ${input.from.toISOString()}::timestamptz
      and cycle.created_at < ${input.toExclusive.toISOString()}::timestamptz
      and (${input.connectionId ?? null}::uuid is null
        or thread.provider_connection_id = ${input.connectionId ?? null}::uuid)
    group by coalesce(thread.source, 'unknown'), thread.channel
    order by count(*) desc
  `);
  return rows as unknown as Array<{
    channel: string;
    conversation_count: string | number;
    source: string;
  }>;
}

export async function queryCrmStatisticsConnection(
  db: DrizzleCrmClient,
  input: LoadCrmStatisticsInput,
) {
  if (!input.connectionId) return null;
  const rows = await db.execute(sql`
    select id, display_name, provider, channel, state
    from crm_channel_connections
    where id = ${input.connectionId}::uuid
      and tenant_id = ${input.tenantId}::uuid
      and store_id = ${input.storeId}::uuid
    limit 1
  `);
  return (
    (
      rows as unknown as Array<{
        channel: string;
        display_name: string;
        id: string;
        provider: string;
        state: string;
      }>
    )[0] ?? null
  );
}

export async function queryCrmStatisticsDaily(
  db: DrizzleCrmClient,
  input: LoadCrmStatisticsInput,
) {
  const rows = await db.execute(sql`
    with days as (
      select generate_series(
        (${input.from.toISOString()}::timestamptz at time zone 'America/Sao_Paulo')::date,
        ((${input.toExclusive.toISOString()}::timestamptz - interval '1 microsecond')
          at time zone 'America/Sao_Paulo')::date,
        interval '1 day'
      )::date as day
    ), cycles as (
      select (cycle.created_at at time zone 'America/Sao_Paulo')::date as day,
        count(*) as count
      from crm_conversation_cycles cycle
      inner join crm_conversation_threads thread on thread.id = cycle.thread_id
      where cycle.tenant_id = ${input.tenantId}::uuid
        and cycle.store_id = ${input.storeId}::uuid
        and cycle.created_at >= ${input.from.toISOString()}::timestamptz
        and cycle.created_at < ${input.toExclusive.toISOString()}::timestamptz
        and (${input.connectionId ?? null}::uuid is null
          or thread.provider_connection_id = ${input.connectionId ?? null}::uuid)
      group by 1
    ), messages as (
      select (occurred_at at time zone 'America/Sao_Paulo')::date as day,
        count(*) filter (where direction = 'inbound') as inbound,
        count(*) filter (where direction = 'outbound' and sender = 'human') as human_outbound,
        count(*) filter (where direction = 'outbound' and sender = 'bot'
          and sender_origin = 'external_bot') as external_ai_outbound,
        count(*) filter (where direction = 'outbound' and
          (sender = 'system' or (sender = 'bot' and sender_origin <> 'external_bot')))
          as internal_automation_outbound,
        count(*) filter (where direction = 'outbound'
          and sender not in ('human', 'bot', 'system')) as other_outbound
      from crm_messages
      where tenant_id = ${input.tenantId}::uuid
        and store_id = ${input.storeId}::uuid and deleted_at is null
        and occurred_at >= ${input.from.toISOString()}::timestamptz
        and occurred_at < ${input.toExclusive.toISOString()}::timestamptz
        and (${input.connectionId ?? null}::uuid is null
          or provider_connection_id = ${input.connectionId ?? null}::uuid)
      group by 1
    )
    select to_char(days.day, 'YYYY-MM-DD') as day,
      coalesce(cycles.count, 0) as conversations_created,
      coalesce(messages.inbound, 0) as inbound,
      coalesce(messages.human_outbound, 0) as human_outbound,
      coalesce(messages.external_ai_outbound, 0) as external_ai_outbound,
      coalesce(messages.internal_automation_outbound, 0) as internal_automation_outbound,
      coalesce(messages.other_outbound, 0) as other_outbound
    from days left join cycles using (day) left join messages using (day)
    order by days.day
  `);
  return rows as unknown as Array<{
    conversations_created: string | number;
    day: string;
    external_ai_outbound: string | number;
    human_outbound: string | number;
    inbound: string | number;
    internal_automation_outbound: string | number;
    other_outbound: string | number;
  }>;
}
