import { sql } from "drizzle-orm";
import type { ExternalBotCommand } from "../../../domains/crm/bot/externalBotModels.js";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import {
  type ExternalBotDb,
  type ExternalBotRow,
} from "./drizzleExternalBotShared.js";
import {
  createAppointment,
  createTask,
  openOpportunity,
  recordVehicleInterest,
  requestHandoff,
} from "./drizzleExternalBotInternalWork.js";

type DispatchInput = Parameters<
  ExternalBotManagerPorts["effectDispatcher"]["dispatch"]
>[0];
type InternalCommand = Exclude<
  ExternalBotCommand,
  {
    action:
      "message.send_media" | "message.send_template" | "message.send_text";
  }
>;
type InternalContext = {
  command: InternalCommand;
  contactId: string;
  cycleId: string;
  opportunityId: string | null;
};

export async function executeExternalBotInternalEffect(
  db: ExternalBotDb,
  input: DispatchInput & { command: InternalCommand },
) {
  try {
    return await db.transaction(async (transaction) => {
      const context = await lockAuthorizedContext(transaction, input);
      if (!context) {
        return failure("internal_effect_not_authorized");
      }
      const existing = await transaction.execute(sql`select id
        from crm_external_bot_internal_effects
        where tenant_id=${input.scope.tenantId}::uuid
          and store_id=${input.scope.storeId}::uuid
          and command_id=${input.actionId}::uuid limit 1`);
      if ((existing as unknown as ExternalBotRow[]).length === 1) {
        return { kind: "succeeded" } as const;
      }
      const result = await applyInternalCommand(transaction, input, context);
      if (!result) return failure("internal_effect_invalid_target");
      await transaction.execute(sql`insert into crm_external_bot_internal_effects
        (command_id,effect_type,idempotency_key,result,store_id,tenant_id)
        values (${input.actionId}::uuid,${input.command.action},${input.idempotencyKey},
          ${JSON.stringify(result)}::jsonb,${input.scope.storeId}::uuid,
          ${input.scope.tenantId}::uuid)`);
      return { kind: "succeeded" } as const;
    });
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    return {
      code: typeof code === "string" ? code : "internal_effect_failed",
      kind: "failed",
      retryable: true,
    } as const;
  }
}

async function lockAuthorizedContext(
  db: ExternalBotDb,
  input: DispatchInput & { command: InternalCommand },
): Promise<InternalContext | null> {
  const rows = await db.execute(sql`select cycle.id as cycle_id,
      cycle.opportunity_id,thread.contact_id
    from crm_external_bot_action_commands command
    inner join crm_external_bot_grants grant on grant.id=command.grant_id
      and grant.tenant_id=command.tenant_id and grant.store_id=command.store_id
      and grant.state='consumed' and grant.action_type=command.action_type
    inner join crm_conversation_threads thread on thread.id=command.thread_id
      and thread.tenant_id=command.tenant_id and thread.store_id=command.store_id
      and thread.provider_connection_id=command.provider_connection_id
      and thread.state='open' and thread.contact_id is not null
    inner join crm_channel_connections connection
      on connection.id=thread.provider_connection_id
      and connection.tenant_id=thread.tenant_id and connection.store_id=thread.store_id
      and connection.channel=${input.scope.channel} and connection.provider=${input.scope.provider}
    inner join crm_channel_routing_policies routing
      on routing.tenant_id=thread.tenant_id and routing.store_id=thread.store_id
      and routing.channel=connection.channel and routing.external_bot_mode<>'disabled'
      and ((routing.external_bot_mode='inherit_store_default'
          and routing.default_connection_id=connection.id)
        or (routing.external_bot_mode='explicit_connection'
          and routing.external_bot_connection_id=connection.id))
    inner join crm_conversation_cycles cycle on cycle.thread_id=thread.id
      and cycle.tenant_id=thread.tenant_id and cycle.store_id=thread.store_id
      and cycle.state='active' and cycle.revision=command.expected_revision
    inner join crm_conversation_attendances attendance
      on attendance.cycle_id=cycle.id and attendance.thread_id=thread.id
      and attendance.tenant_id=thread.tenant_id and attendance.store_id=thread.store_id
      and attendance.state='bot_active'
      and attendance.state_version=command.expected_attendance_revision
    inner join integration_accounts account
      on account.id=(command.input->>'integrationId')::uuid
      and account.tenant_id=command.tenant_id and account.store_id=command.store_id
      and account.provider='crm_external_bot' and account.status='active'
    inner join store_entitlements entitlement
      on entitlement.tenant_id=command.tenant_id
      and entitlement.store_id=command.store_id and entitlement.feature_key='crm'
      and entitlement.status='active'
      and (entitlement.starts_at is null or entitlement.starts_at<=now())
      and (entitlement.ends_at is null or entitlement.ends_at>now())
    where command.id=${input.actionId}::uuid and command.state='executing'
      and command.tenant_id=${input.scope.tenantId}::uuid
      and command.store_id=${input.scope.storeId}::uuid
      and command.thread_id=${input.scope.threadId}::uuid
      and command.provider_connection_id=${input.scope.connectionId}::uuid
      and command.action_type=${input.command.action}
      and command.idempotency_key=${input.idempotencyKey}
      and command.expected_revision=${input.scope.expectedRevision}
      and command.expected_attendance_revision=${input.scope.expectedAttendanceRevision}
      and not exists (
        select 1 from crm_external_bot_kill_switches switch where switch.enabled=true and (
          switch.level='global'
          or (switch.level='tenant' and switch.scope_value=command.tenant_id::text)
          or (switch.level='store' and switch.scope_value=command.store_id::text)
          or (switch.level='integration' and switch.scope_value=command.input->>'integrationId')
          or (switch.level='connection' and switch.scope_value=command.provider_connection_id::text)
          or (switch.level='thread' and switch.scope_value=command.thread_id::text)
          or (switch.level='provider' and switch.scope_value=command.provider::text)
          or (switch.level='action' and switch.action_type=command.action_type)
          or (switch.level='model_version' and switch.scope_value=command.input->>'modelVersion')
        ))
      and (command.authorization_class='automatic' or
        (command.authorization_class='human_approved' and exists (
          select 1 from crm_external_bot_proposals proposal
          where proposal.command_id=command.id
            and proposal.tenant_id=command.tenant_id
            and proposal.store_id=command.store_id
            and proposal.decision_state='approved')))
    for update of command,cycle,attendance`);
  const row = (rows as unknown as ExternalBotRow[])[0];
  return row
    ? {
        command: input.command,
        contactId: String(row.contact_id),
        cycleId: String(row.cycle_id),
        opportunityId: row.opportunity_id ? String(row.opportunity_id) : null,
      }
    : null;
}

async function applyInternalCommand(
  db: ExternalBotDb,
  input: DispatchInput & { command: InternalCommand },
  context: InternalContext,
): Promise<Record<string, string> | null> {
  switch (input.command.action) {
    case "conversation.summarize":
      return recordFact(db, input, context, "conversation_summary", {
        summary: input.command.payload.summary,
      });
    case "fact.record":
      return recordFact(
        db,
        input,
        context,
        input.command.payload.classification,
        {
          summary: input.command.payload.summary,
        },
      );
    case "opportunity.open":
      return openOpportunity(db, input, context);
    case "vehicle_interest.record":
      return recordVehicleInterest(db, input, context);
    case "task.create":
      return createTask(db, input, context);
    case "appointment.create":
      return createAppointment(db, input, context);
    case "handoff.request":
      return requestHandoff(db, input, context);
  }
}

async function recordFact(
  db: ExternalBotDb,
  input: DispatchInput,
  context: InternalContext,
  key: string,
  value: Record<string, unknown>,
) {
  const rows = await db.execute(sql`insert into observed_facts
      (id,confidence,contact_id,fact_key,fact_value,store_id,tenant_id)
    values (${input.actionId}::uuid,1,${context.contactId}::uuid,${key},
      ${JSON.stringify(value)}::jsonb,${input.scope.storeId}::uuid,
      ${input.scope.tenantId}::uuid)
    on conflict (tenant_id,store_id,id) do nothing returning id`);
  return (rows as unknown as ExternalBotRow[]).length === 1
    ? { observedFactId: input.actionId }
    : null;
}

function failure(code: string) {
  return { code, kind: "failed", retryable: false } as const;
}
