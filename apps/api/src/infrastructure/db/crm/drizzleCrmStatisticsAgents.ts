import { sql } from "drizzle-orm";
import type { LoadCrmStatisticsInput } from "../../../domains/crm/readModels/crmStatisticsReadModel.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export type CrmStatisticsAgentRow = {
  active: boolean;
  agent_id: string;
  average_first_response_ms: string | number | null;
  email: string;
  handled_conversations: string | number;
  human_outbound_messages: string | number;
  name: string | null;
  open_assignments: string | number;
  role: string;
};

export async function queryCrmStatisticsAgents(
  db: DrizzleCrmClient,
  input: LoadCrmStatisticsInput,
) {
  const rows = await db.execute(sql`
    with scoped_cycles as (
      select cycle.*, thread.provider_connection_id
      from crm_conversation_cycles cycle
      inner join crm_conversation_threads thread on thread.id = cycle.thread_id
      where cycle.tenant_id = ${input.tenantId}::uuid
        and cycle.store_id = ${input.storeId}::uuid
        and (${input.connectionId ?? null}::uuid is null
          or thread.provider_connection_id = ${input.connectionId ?? null}::uuid)
    ), cycle_stats as (
      select assigned_user_id,
        count(*) filter (where state = 'active') as open_assignments,
        count(*) filter (where first_handled_at >=
          ${input.from.toISOString()}::timestamptz and first_handled_at <
          ${input.toExclusive.toISOString()}::timestamptz)
          as handled_conversations
      from scoped_cycles where assigned_user_id is not null group by assigned_user_id
    ), message_stats as (
      select cycle.assigned_user_id, count(message.id) as human_outbound_messages
      from scoped_cycles cycle inner join crm_messages message on message.cycle_id = cycle.id
      where cycle.assigned_user_id is not null and message.deleted_at is null
        and message.sender = 'human' and message.direction = 'outbound'
        and message.occurred_at >= ${input.from.toISOString()}::timestamptz
        and message.occurred_at < ${input.toExclusive.toISOString()}::timestamptz
      group by cycle.assigned_user_id
    ), response_samples as (
      select cycle.assigned_user_id, cycle.id, extract(epoch from (
        cycle.first_handled_at - min(message.occurred_at)
      )) * 1000 as response_ms
      from scoped_cycles cycle
      inner join crm_messages message on message.cycle_id = cycle.id
        and message.direction = 'inbound' and message.deleted_at is null
      where cycle.assigned_user_id is not null
        and cycle.first_handled_at >= ${input.from.toISOString()}::timestamptz
        and cycle.first_handled_at < ${input.toExclusive.toISOString()}::timestamptz
      group by cycle.assigned_user_id, cycle.id, cycle.first_handled_at
      having cycle.first_handled_at >= min(message.occurred_at)
    ), response_stats as (
      select assigned_user_id, avg(response_ms) as average_first_response_ms
      from response_samples group by assigned_user_id
    )
    select membership.user_id as agent_id, membership.status = 'active' as active,
      user_record.email, user_record.name, role.name as role,
      coalesce(cycle_stats.open_assignments, 0) as open_assignments,
      coalesce(cycle_stats.handled_conversations, 0) as handled_conversations,
      coalesce(message_stats.human_outbound_messages, 0) as human_outbound_messages,
      response_stats.average_first_response_ms
    from store_memberships membership
    inner join users user_record on user_record.id = membership.user_id
    inner join role_templates role on role.id = membership.role_template_id
    left join cycle_stats on cycle_stats.assigned_user_id = membership.user_id
    left join message_stats on message_stats.assigned_user_id = membership.user_id
    left join response_stats on response_stats.assigned_user_id = membership.user_id
    where membership.tenant_id = ${input.tenantId}::uuid
      and membership.store_id = ${input.storeId}::uuid
      and membership.status = 'active'
      and user_record.is_deleted = false
    group by membership.user_id, membership.status, user_record.email,
      user_record.name, role.name, cycle_stats.open_assignments,
      cycle_stats.handled_conversations, message_stats.human_outbound_messages,
      response_stats.average_first_response_ms
    order by handled_conversations desc, open_assignments desc, user_record.name
  `);
  return rows as unknown as CrmStatisticsAgentRow[];
}
