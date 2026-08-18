import { sql } from "drizzle-orm";
import type {
  ExternalBotActionName,
  ExternalBotScope,
} from "../../../domains/crm/bot/externalBotModels.js";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import {
  type ExternalBotDb,
  type ExternalBotRow,
  mapExternalBotCommand,
} from "./drizzleExternalBotShared.js";
import { executeExternalBotInternalEffect } from "./drizzleExternalBotInternalEffects.js";

export async function inspectExternalBotScope(
  db: ExternalBotDb,
  scope: ExternalBotScope,
) {
  const rows =
    await db.execute(sql`select cycle.revision, attendance.state_version as attendance_revision,
      attendance.state <> 'bot_active' as human_active
    from crm_conversation_threads thread
    inner join tenants tenant on tenant.id=thread.tenant_id and tenant.deleted_at is null
    inner join stores store on store.id=thread.store_id and store.tenant_id=thread.tenant_id and store.deleted_at is null
    inner join store_entitlements entitlement on entitlement.tenant_id=thread.tenant_id and entitlement.store_id=thread.store_id
      and entitlement.feature_key='crm' and entitlement.status in ('active','trialing')
      and (entitlement.starts_at is null or entitlement.starts_at<=now()) and (entitlement.ends_at is null or entitlement.ends_at>now())
    inner join integration_accounts account on account.id=${scope.integrationId}::uuid and account.tenant_id=thread.tenant_id
      and account.store_id=thread.store_id and account.status='active' and account.provider='crm_external_bot'
    inner join lateral (
      select candidate.id from crm_conversation_cycles candidate
      where candidate.thread_id=thread.id and candidate.tenant_id=thread.tenant_id
        and candidate.store_id=thread.store_id and candidate.state='active'
        and 1=(select count(*) from crm_conversation_cycles active_cycle
          where active_cycle.thread_id=thread.id and active_cycle.tenant_id=thread.tenant_id
            and active_cycle.store_id=thread.store_id and active_cycle.state='active')
      limit 1
    ) cycle on true
    inner join crm_conversation_attendances attendance on attendance.cycle_id=cycle.id
      and attendance.thread_id=thread.id and attendance.tenant_id=thread.tenant_id
      and attendance.store_id=thread.store_id
    where thread.id=${scope.threadId}::uuid and thread.tenant_id=${scope.tenantId}::uuid and thread.store_id=${scope.storeId}::uuid
      and thread.provider_connection_id=${scope.connectionId}::uuid
      and exists (
        select 1 from crm_channel_connections connection
        where connection.id=thread.provider_connection_id
          and connection.channel=${scope.channel}
          and connection.provider=${scope.provider}
          and exists (
            select 1 from crm_channel_routing_policies routing
            where routing.tenant_id=connection.tenant_id
              and routing.store_id=connection.store_id
              and routing.channel=connection.channel
              and routing.external_bot_mode <> 'disabled'
              and (
                (routing.external_bot_mode='inherit_store_default'
                  and routing.default_connection_id=connection.id)
                or (routing.external_bot_mode='explicit_connection'
                  and routing.external_bot_connection_id=connection.id)
              )
          )
      ) limit 1`);
  const row = (rows as unknown as ExternalBotRow[])[0];
  return {
    attendanceRevision: Number(row?.attendance_revision ?? -1),
    humanAttendanceActive: row?.human_active === true,
    revision: Number(row?.revision ?? -1),
    scopeExists: Boolean(row),
  };
}

export async function resolveExternalBotKillSwitch(
  db: ExternalBotDb,
  scope: ExternalBotScope,
  action: ExternalBotActionName,
  actionClass: "effect" | "proposal",
) {
  const rows =
    await db.execute(sql`select level from crm_external_bot_kill_switches where enabled=true and
    (level='global' or (level='tenant' and scope_value=${scope.tenantId}) or (level='store' and scope_value=${scope.storeId})
      or (level='integration' and scope_value=${scope.integrationId}) or (level='connection' and scope_value=${scope.connectionId})
      or (level='thread' and scope_value=${scope.threadId}) or (level='action' and action_type=${action})
      or (level='action_class' and scope_value=${actionClass})
      or (level='provider' and scope_value=${scope.provider})
      or (level='model_version' and scope_value=${scope.modelVersion}) or level='pii_export')
    order by case level when 'global' then 0 else 1 end limit 1`);
  return ((rows as unknown as ExternalBotRow[])[0]?.level as never) ?? null;
}

export async function recordExternalBotProposal(
  db: ExternalBotDb,
  input: Parameters<ExternalBotManagerPorts["proposalRecorder"]["record"]>[0],
) {
  await db.execute(sql`insert into crm_external_bot_proposals (tenant_id,store_id,command_id,action_type,payload,idempotency_key)
    values (${input.scope.tenantId}::uuid,${input.scope.storeId}::uuid,${input.actionId}::uuid,${input.command.action},${JSON.stringify(input.command.payload)}::jsonb,${input.idempotencyKey})
    on conflict (tenant_id,store_id,idempotency_key) do nothing`);
  return { kind: "recorded" } as const;
}

export function createExternalBotProposalDecider(
  db: ExternalBotDb,
): ExternalBotManagerPorts["proposalRecorder"]["decide"] {
  return (input) =>
    db.transaction(async (transaction) => {
      const existingRows =
        await transaction.execute(sql`select proposal.*, command.*,
          proposal.id as proposal_id, proposal.revision as proposal_revision,
          proposal.decision_state, proposal.decided_at, proposal.decided_by_user_id
        from crm_external_bot_proposals proposal
        inner join crm_external_bot_action_commands command on command.id=proposal.command_id
          and command.tenant_id=proposal.tenant_id and command.store_id=proposal.store_id
        inner join tenants tenant on tenant.id=proposal.tenant_id and tenant.deleted_at is null
        inner join stores store on store.id=proposal.store_id and store.tenant_id=proposal.tenant_id and store.deleted_at is null
        where proposal.id=${input.proposalId}::uuid and proposal.tenant_id=${input.tenantId}::uuid
          and proposal.store_id=${input.storeId}::uuid for update of proposal, command`);
      const existing = (existingRows as unknown as ExternalBotRow[])[0];
      if (!existing) return { kind: "not_found" } as const;
      const currentDecision = String(existing.decision_state);
      if (currentDecision !== "pending") {
        return currentDecision === input.decision
          ? mapProposalDecision("existing", existing)
          : ({ kind: "conflict" } as const);
      }
      if (Number(existing.proposal_revision) !== input.expectedRevision) {
        return { kind: "conflict" } as const;
      }
      const actionState =
        input.decision === "approved" ? "authorized" : "cancelled";
      const authorizationClass =
        input.decision === "approved" ? "human_approved" : "proposal_only";
      const rows = await transaction.execute(sql`with decided as (
          update crm_external_bot_proposals set decision_state=${input.decision},
            decided_at=now(), decided_by_user_id=${input.actorUserId}::uuid,
            decision_reason=${input.reason ?? null}, revision=revision+1, updated_at=now()
          where id=${input.proposalId}::uuid and tenant_id=${input.tenantId}::uuid
            and store_id=${input.storeId}::uuid and decision_state='pending'
            and revision=${input.expectedRevision}
          returning *)
        update crm_external_bot_action_commands command set state=${actionState},
          authorization_class=${authorizationClass},
          approved_at=case when ${input.decision}='approved' then now() else null end,
          approved_by_user_id=case when ${input.decision}='approved' then ${input.actorUserId}::uuid else null end,
          revision=command.revision+1, updated_at=now()
        from decided where command.id=decided.command_id and command.tenant_id=decided.tenant_id
          and command.store_id=decided.store_id and command.state='pending_approval'
        returning command.*, decided.id as proposal_id, decided.revision as proposal_revision,
          decided.decision_state, decided.decided_at, decided.decided_by_user_id`);
      const row = (rows as unknown as ExternalBotRow[])[0];
      return row
        ? mapProposalDecision("decided", row)
        : ({ kind: "conflict" } as const);
    });
}

export async function enqueueExternalBotProviderEffect(
  db: ExternalBotDb,
  input: Parameters<ExternalBotManagerPorts["effectDispatcher"]["dispatch"]>[0],
) {
  const rows =
    await db.execute(sql`insert into crm_external_bot_provider_effects
    (command_id,effect_type,idempotency_key,provider,provider_connection_id,result,state,store_id,tenant_id)
    select ${input.actionId}::uuid,${input.command.action},${input.idempotencyKey},connection.provider,
      ${input.scope.connectionId}::uuid,'{}'::jsonb,'accepted',${input.scope.storeId}::uuid,${input.scope.tenantId}::uuid
    from crm_external_bot_action_commands command
    inner join crm_channel_connections connection on connection.id=command.provider_connection_id
      and connection.tenant_id=command.tenant_id and connection.store_id=command.store_id
      and connection.provider=command.provider
    inner join tenants tenant on tenant.id=connection.tenant_id and tenant.deleted_at is null
    inner join stores store on store.id=connection.store_id and store.tenant_id=connection.tenant_id and store.deleted_at is null
    where command.id=${input.actionId}::uuid and command.state='executing'
      and (command.authorization_class='automatic' or
        (command.authorization_class='human_approved' and exists (
          select 1 from crm_external_bot_proposals proposal
          where proposal.command_id=command.id and proposal.tenant_id=command.tenant_id
            and proposal.store_id=command.store_id and proposal.decision_state='approved')))
      and connection.id=${input.scope.connectionId}::uuid
      and connection.tenant_id=${input.scope.tenantId}::uuid and connection.store_id=${input.scope.storeId}::uuid
      and connection.provider=${input.scope.provider} and connection.channel=${input.scope.channel}
    on conflict (tenant_id,store_id,provider,idempotency_key) do nothing returning id`);
  if ((rows as unknown as ExternalBotRow[]).length === 0) {
    return {
      code: "provider_effect_conflict",
      kind: "failed",
      retryable: false,
    } as const;
  }
  return { kind: "queued" } as const;
}

export async function dispatchExternalBotEffect(
  db: ExternalBotDb,
  input: Parameters<ExternalBotManagerPorts["effectDispatcher"]["dispatch"]>[0],
) {
  if (
    input.command.action === "message.send_text" ||
    input.command.action === "message.send_media" ||
    input.command.action === "message.send_template"
  ) {
    return enqueueExternalBotProviderEffect(db, input);
  }
  return executeExternalBotInternalEffect(db, {
    ...input,
    command: input.command,
  });
}

function mapProposalDecision(
  kind: "decided" | "existing",
  row: ExternalBotRow,
) {
  const action = mapExternalBotCommand(row);
  return {
    action,
    kind,
    proposal: {
      actionId: action.id,
      channel: action.channel,
      command: action.command,
      connectionId: action.connectionId,
      decision: row.decision_state as "approved" | "pending" | "rejected",
      ...(row.decided_at
        ? { decidedAt: new Date(String(row.decided_at)) }
        : {}),
      ...(row.decided_by_user_id
        ? { decidedByUserId: String(row.decided_by_user_id) }
        : {}),
      id: String(row.proposal_id),
      idempotencyKey: action.idempotencyKey,
      integrationId: action.integrationId,
      modelVersion: action.modelVersion,
      provider: action.provider,
      revision: Number(row.proposal_revision),
      storeId: action.storeId,
      tenantId: action.tenantId,
      threadId: action.threadId,
    },
  } as const;
}
