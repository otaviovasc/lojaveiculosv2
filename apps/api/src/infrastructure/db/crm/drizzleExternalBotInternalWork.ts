import { sql } from "drizzle-orm";
import type { ExternalBotCommand } from "../../../domains/crm/bot/externalBotModels.js";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import {
  type ExternalBotDb,
  type ExternalBotRow,
} from "./drizzleExternalBotShared.js";

type Input = Parameters<
  ExternalBotManagerPorts["effectDispatcher"]["dispatch"]
>[0];
type Context = {
  contactId: string;
  cycleId: string;
  opportunityId: string | null;
};

export async function openOpportunity(
  db: ExternalBotDb,
  input: Input,
  context: Context,
) {
  const opportunityId = await ensureOpportunity(
    db,
    input,
    context,
    (
      input.command as Extract<
        ExternalBotCommand,
        { action: "opportunity.open" }
      >
    ).payload.summary,
  );
  return opportunityId ? { opportunityId } : null;
}

export async function recordVehicleInterest(
  db: ExternalBotDb,
  input: Input,
  context: Context,
) {
  const command = input.command as Extract<
    ExternalBotCommand,
    { action: "vehicle_interest.record" }
  >;
  const opportunityId = await ensureOpportunity(
    db,
    input,
    context,
    "Vehicle interest",
  );
  if (!opportunityId) return null;
  const listing = await db.execute(sql`select id from vehicle_listings
    where id=${command.payload.vehicleRef}::uuid
      and tenant_id=${input.scope.tenantId}::uuid
      and store_id=${input.scope.storeId}::uuid and is_deleted=false limit 1`);
  if ((listing as unknown as ExternalBotRow[]).length !== 1) return null;
  const rows = await db.execute(sql`insert into vehicle_interests
      (contact_id,listing_id,opportunity_id,store_id,tenant_id)
    values (${context.contactId}::uuid,${command.payload.vehicleRef}::uuid,
      ${opportunityId}::uuid,${input.scope.storeId}::uuid,${input.scope.tenantId}::uuid)
    on conflict (opportunity_id,listing_id,unit_id) do nothing returning id`);
  const interestId = (rows as unknown as ExternalBotRow[])[0]?.id;
  if (!interestId) return null;
  await db.execute(sql`insert into observed_facts
      (confidence,contact_id,fact_key,fact_value,store_id,tenant_id)
    values (1,${context.contactId}::uuid,'vehicle_interest_level',
      ${JSON.stringify({ interestLevel: command.payload.interestLevel, vehicleRef: command.payload.vehicleRef })}::jsonb,
      ${input.scope.storeId}::uuid,${input.scope.tenantId}::uuid)`);
  return { opportunityId, vehicleInterestId: String(interestId) };
}

export async function createTask(
  db: ExternalBotDb,
  input: Input,
  context: Context,
) {
  const payload = (
    input.command as Extract<ExternalBotCommand, { action: "task.create" }>
  ).payload;
  const rows = await db.execute(sql`insert into crm_tasks
      (command_id,contact_id,cycle_id,due_at,opportunity_id,thread_id,title,store_id,tenant_id)
    values (${input.actionId}::uuid,${context.contactId}::uuid,${context.cycleId}::uuid,
      ${payload.dueAt ?? null}::timestamptz,${context.opportunityId}::uuid,
      ${input.scope.threadId}::uuid,${payload.title},${input.scope.storeId}::uuid,
      ${input.scope.tenantId}::uuid) returning id`);
  const id = (rows as unknown as ExternalBotRow[])[0]?.id;
  return id ? { taskId: String(id) } : null;
}

export async function createAppointment(
  db: ExternalBotDb,
  input: Input,
  context: Context,
) {
  const payload = (
    input.command as Extract<
      ExternalBotCommand,
      { action: "appointment.create" }
    >
  ).payload;
  const rows = await db.execute(sql`insert into crm_appointments
      (command_id,contact_id,cycle_id,opportunity_id,starts_at,summary,thread_id,store_id,tenant_id)
    values (${input.actionId}::uuid,${context.contactId}::uuid,${context.cycleId}::uuid,
      ${context.opportunityId}::uuid,${payload.startsAt}::timestamptz,${payload.summary ?? null},
      ${input.scope.threadId}::uuid,${input.scope.storeId}::uuid,
      ${input.scope.tenantId}::uuid) returning id`);
  const id = (rows as unknown as ExternalBotRow[])[0]?.id;
  return id ? { appointmentId: String(id) } : null;
}

export async function requestHandoff(
  db: ExternalBotDb,
  input: Input,
  context: Context,
) {
  const reason = (
    input.command as Extract<ExternalBotCommand, { action: "handoff.request" }>
  ).payload.reason;
  const rows = await db.execute(sql`with event as (
      insert into crm_conversation_attendance_events
        (actor_id,actor_kind,cycle_id,idempotency_key,intervention_id,next_state,
         previous_state,reason,request_fingerprint,state_version,store_id,tenant_id,thread_id)
      select command.input->>'integrationId','bot',attendance.cycle_id,
        command.idempotency_key,command.id,'handoff_requested',attendance.state,
        ${reason},command.request_digest,attendance.state_version+1,
        attendance.store_id,attendance.tenant_id,attendance.thread_id
      from crm_conversation_attendances attendance
      inner join crm_external_bot_action_commands command on command.id=${input.actionId}::uuid
      where attendance.cycle_id=${context.cycleId}::uuid and attendance.state='bot_active'
      returning *)
    update crm_conversation_attendances attendance set state='handoff_requested',
      state_version=event.state_version,revision=attendance.revision+1,
      handoff_requested_at=now(),intervention_id=${input.actionId}::uuid,updated_at=now()
    from event where attendance.cycle_id=event.cycle_id
      and attendance.tenant_id=event.tenant_id and attendance.store_id=event.store_id
    returning attendance.id`);
  return (rows as unknown as ExternalBotRow[]).length === 1
    ? { attendanceId: String((rows as unknown as ExternalBotRow[])[0]!.id) }
    : null;
}

async function ensureOpportunity(
  db: ExternalBotDb,
  input: Input,
  context: Context,
  summary: string,
) {
  if (context.opportunityId) return context.opportunityId;
  const rows = await db.execute(sql`with created as (
      insert into opportunities (contact_id,metadata,source,state,store_id,tenant_id)
      values (${context.contactId}::uuid,${JSON.stringify({ externalBotSummary: summary })}::jsonb,
        'manual','open',${input.scope.storeId}::uuid,${input.scope.tenantId}::uuid)
      returning id), linked as (
      update crm_conversation_cycles cycle set opportunity_id=created.id,
        revision=cycle.revision+1,updated_at=now() from created
      where cycle.id=${context.cycleId}::uuid and cycle.thread_id=${input.scope.threadId}::uuid
        and cycle.tenant_id=${input.scope.tenantId}::uuid
        and cycle.store_id=${input.scope.storeId}::uuid and cycle.opportunity_id is null
      returning created.id)
    select id from linked`);
  return (rows as unknown as ExternalBotRow[])[0]?.id
    ? String((rows as unknown as ExternalBotRow[])[0]!.id)
    : null;
}
