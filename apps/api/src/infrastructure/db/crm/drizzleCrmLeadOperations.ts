import {
  leads,
  conversationCycles,
  conversationAttendances,
  crmMessages,
  leadActivities,
  opportunities,
} from "@lojaveiculosv2/db";
import { sql, type SQL } from "drizzle-orm";
import type {
  CrmLeadOperationalFilters,
  CrmLeadCursor,
} from "../../../domains/crm/ports/crmRepository.js";

// Both legacy lead links and canonical opportunities belong to the same scope.
const linkedCycle = sql`c.tenant_id = ${leads.tenantId} and c.store_id = ${leads.storeId}
  and c.deleted_at is null and c.id in (
    select linked.id from ${conversationCycles} linked
      where linked.tenant_id = ${leads.tenantId} and linked.store_id = ${leads.storeId}
        and linked.metadata->>'leadId' = ${leads.id}::text
    union
    select linked.id from ${conversationCycles} linked join ${opportunities} o on o.id = linked.opportunity_id
      where linked.tenant_id = ${leads.tenantId} and linked.store_id = ${leads.storeId}
        and o.tenant_id = ${leads.tenantId} and o.store_id = ${leads.storeId}
        and o.legacy_lead_id = ${leads.id})`;
const communicationActivity = sql`a.lead_id = ${leads.id} and a.tenant_id = ${leads.tenantId}
  and a.store_id = ${leads.storeId} and a.activity_type in ('call', 'message', 'email')
  and a.direction in ('inbound', 'outbound')`;
const deliveredMessage = sql`m.deleted_at is null and m.tenant_id = ${leads.tenantId}
  and m.store_id = ${leads.storeId}
  and (m.direction = 'inbound' or m.status in ('sent', 'delivered', 'read'))`;

export const actualLastInteraction = sql<string | null>`greatest(
  (select max(a.occurred_at) from ${leadActivities} a where ${communicationActivity}),
  (select max(m.occurred_at) from ${crmMessages} m join ${conversationCycles} c on c.id = m.cycle_id
    where ${linkedCycle} and ${deliveredMessage}))`;
export const leadResponseState = sql<"responded" | "no_response">`case when
  exists (select 1 from ${leadActivities} a where ${communicationActivity} and a.direction = 'outbound')
  or exists (select 1 from ${crmMessages} m join ${conversationCycles} c on c.id = m.cycle_id
    where ${linkedCycle} and ${deliveredMessage} and m.direction = 'outbound')
  then 'responded' else 'no_response' end`;
const attendanceScope = sql`att.tenant_id = ${leads.tenantId} and att.store_id = ${leads.storeId}`;
export const leadAttendanceState = sql<
  "waiting_human" | "in_human_service" | null
>`(
  select case when att.state = 'human_active' then 'in_human_service' else 'waiting_human' end
  from ${conversationCycles} c join ${conversationAttendances} att on att.cycle_id = c.id
  where ${linkedCycle} and c.state = 'active' and c.archived_at is null
    and ${attendanceScope}
    and att.state in ('human_active', 'handoff_requested', 'human_claimed')
  order by (att.state = 'human_active') desc, c.updated_at desc, c.id desc limit 1)`;
// Old UI stored local times without an offset. Interpret those in the store's
// existing Brazil timezone; new clients send explicit ISO instants.
const taskDue = sql`case when a.metadata->>'dueAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}'
  and pg_input_is_valid(a.metadata->>'dueAt', 'timestamp with time zone')
  then case when a.metadata->>'dueAt' ~ '(Z|[+-][0-9]{2}:[0-9]{2})$'
    then (a.metadata->>'dueAt')::timestamptz
    else (a.metadata->>'dueAt')::timestamp at time zone 'America/Sao_Paulo' end end`;
const pendingTask = sql`a.lead_id = ${leads.id} and a.tenant_id = ${leads.tenantId}
  and a.store_id = ${leads.storeId} and a.activity_type = 'task'
  and coalesce(a.metadata->>'completed', 'false') <> 'true'
  and nullif(a.metadata->>'completedAt', '') is null
  and coalesce(a.metadata->>'status', 'pending') not in ('completed', 'cancelled', 'done')`;
export const nextTaskDue = sql<
  string | null
>`(select min(${taskDue}) from ${leadActivities} a where ${pendingTask})`;
export const leadNextTask = sql<{
  id: string;
  title: string;
  dueAt: string;
} | null>`(
  select jsonb_build_object('id', a.id, 'title', coalesce(nullif(a.metadata->>'title', ''), a.content), 'dueAt', ${taskDue})
  from ${leadActivities} a where ${pendingTask} and ${taskDue} is not null
  order by ${taskDue} asc, a.id asc limit 1)`;

export const leadOperationalColumns = {
  actualLastInteraction: actualLastInteraction.as("actual_last_interaction"),
  responseState: leadResponseState.as("response_state"),
  humanAttendanceState: leadAttendanceState.as("human_attendance_state"),
  nextTask: leadNextTask.as("next_task"),
};

export function operationalLeadConditions(
  input: CrmLeadOperationalFilters,
): SQL[] {
  const filters: SQL[] = [];
  if (input.responseState)
    filters.push(sql`${leadResponseState} = ${input.responseState}`);
  if (input.humanAttendanceState)
    filters.push(sql`${leadAttendanceState} = ${input.humanAttendanceState}`);
  // Unknown interaction dates are not invented or treated as lead creation.
  if (input.inactiveDays)
    filters.push(
      sql`${actualLastInteraction} <= now() - ${input.inactiveDays} * interval '1 day'`,
    );
  return filters;
}

export function operationalLeadOrder(
  sortBy?: CrmLeadOperationalFilters["sortBy"],
) {
  return sortBy === "next_task"
    ? sql`${nextTaskDue} asc nulls last, ${leads.updatedAt} desc, ${leads.id} desc`
    : sortBy === "created_at"
      ? sql`${leads.createdAt} desc, ${leads.updatedAt} desc, ${leads.id} desc`
      : sql`${leads.updatedAt} desc, ${leads.id} desc`;
}

export function operationalLeadCursor(
  cursor: CrmLeadCursor,
  sortBy?: CrmLeadOperationalFilters["sortBy"],
): SQL {
  const tie = sql`(${leads.updatedAt}, ${leads.id}) < (${cursor.updatedAt.toISOString()}::timestamptz, ${cursor.id}::uuid)`;
  if (sortBy === "next_task")
    return cursor.sortAt
      ? sql`(${nextTaskDue} > ${cursor.sortAt.toISOString()}::timestamptz or ${nextTaskDue} is null
        or (${nextTaskDue} = ${cursor.sortAt.toISOString()}::timestamptz and ${tie}))`
      : sql`(${nextTaskDue} is null and ${tie})`;
  if (sortBy === "created_at" && cursor.sortAt)
    return sql`(${leads.createdAt} < ${cursor.sortAt.toISOString()}::timestamptz
    or (${leads.createdAt} = ${cursor.sortAt.toISOString()}::timestamptz and ${tie}))`;
  return tie;
}
