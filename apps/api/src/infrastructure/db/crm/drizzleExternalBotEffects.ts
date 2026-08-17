import { sql } from "drizzle-orm";
import type {
  ExternalBotActionName,
  ExternalBotScope,
} from "../../../domains/crm/bot/externalBotModels.js";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import {
  type ExternalBotDb,
  type ExternalBotRow,
  isProposalAction,
} from "./drizzleExternalBotShared.js";

export async function inspectExternalBotScope(
  db: ExternalBotDb,
  scope: ExternalBotScope,
) {
  const rows =
    await db.execute(sql`select thread.revision, coalesce(attendance.state <> 'bot_active', false) as human_active
    from conversation_threads thread
    inner join store_entitlements entitlement on entitlement.tenant_id=thread.tenant_id and entitlement.store_id=thread.store_id
      and entitlement.feature_key='crm' and entitlement.status in ('active','trialing')
      and (entitlement.starts_at is null or entitlement.starts_at<=now()) and (entitlement.ends_at is null or entitlement.ends_at>now())
    inner join integration_accounts account on account.id=${scope.integrationId}::uuid and account.tenant_id=thread.tenant_id
      and account.store_id=thread.store_id and account.status='active' and account.provider='crm_whatsapp_bot'
    left join conversation_attendances attendance on attendance.thread_id=thread.id
    where thread.id=${scope.threadId}::uuid and thread.tenant_id=${scope.tenantId}::uuid and thread.store_id=${scope.storeId}::uuid
      and thread.provider_connection_id=${scope.connectionId}::uuid
      and exists (
        select 1 from provider_connections connection
        where connection.id=thread.provider_connection_id
          and connection.channel=${scope.channel}
          and connection.provider=${scope.provider}
          and exists (
            select 1 from crm_channel_routing_policies routing
            where routing.tenant_id=connection.tenant_id
              and routing.store_id=connection.store_id
              and routing.channel=connection.channel
              and routing.bot_routing_mode <> 'disabled'
              and (
                (routing.bot_routing_mode='inherit_store_default'
                  and routing.default_connection_id=connection.id)
                or (routing.bot_routing_mode='explicit_connection'
                  and routing.bot_connection_id=connection.id)
              )
          )
      ) limit 1`);
  const row = (rows as unknown as ExternalBotRow[])[0];
  return {
    humanAttendanceActive: row?.human_active === true,
    revision: Number(row?.revision ?? -1),
    scopeExists: Boolean(row),
  };
}

export async function resolveExternalBotKillSwitch(
  db: ExternalBotDb,
  scope: ExternalBotScope,
  action: ExternalBotActionName,
) {
  const rows =
    await db.execute(sql`select level from crm_external_bot_kill_switches where enabled=true and
    (level='global' or (level='tenant' and scope_value=${scope.tenantId}) or (level='store' and scope_value=${scope.storeId})
      or (level='integration' and scope_value=${scope.integrationId}) or (level='connection' and scope_value=${scope.connectionId})
      or (level='thread' and scope_value=${scope.threadId}) or (level='action' and action_type=${action})
      or (level='action_class' and scope_value=${isProposalAction(action) ? "proposal" : "effect"})
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

export async function enqueueExternalBotProviderEffect(
  db: ExternalBotDb,
  input: Parameters<ExternalBotManagerPorts["effectDispatcher"]["dispatch"]>[0],
) {
  const rows = await db.execute(sql`insert into provider_effects
    (command_id,effect_type,idempotency_key,provider,provider_connection_id,result,state,store_id,tenant_id)
    select ${input.actionId}::uuid,${input.command.action},${input.idempotencyKey},connection.provider,
      ${input.scope.connectionId}::uuid,'{}'::jsonb,'accepted',${input.scope.storeId}::uuid,${input.scope.tenantId}::uuid
    from provider_connections connection where connection.id=${input.scope.connectionId}::uuid
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
