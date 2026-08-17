import { sql } from "drizzle-orm";
import type { ExternalBotCommand } from "../../../domains/crm/bot/externalBotModels.js";
import type {
  ExternalBotDb,
  ExternalBotRow,
} from "./drizzleExternalBotShared.js";
export {
  ExternalBotCanonicalSyncIndeterminateError,
  synchronizeExternalBotEffectOutcome,
} from "./drizzleExternalBotEffectSynchronization.js";

export type AuthorizedExternalBotEffect = {
  canonicalCycleId: string;
  command: Extract<
    ExternalBotCommand,
    { action: "handoff.request" | "message.send" }
  >;
  effectId: string;
  expectedRevision: number;
  idempotencyKey: string;
  integrationId: string;
  legacySessionId: string;
  legacySessionRevision: number;
  modelVersion: string;
  provider: "meta_cloud" | "olx" | "zapi";
  providerConnectionId: string;
  storeId: string;
  tenantId: string;
  threadId: string;
};

export async function loadAuthorizedExternalBotEffect(
  db: ExternalBotDb,
  effectId: string,
): Promise<AuthorizedExternalBotEffect | null> {
  const rows = await db.execute(sql`
    select effect.id, effect.idempotency_key, effect.provider,
      effect.provider_connection_id, effect.store_id, effect.tenant_id,
      command.action_type, command.expected_revision, command.input,
      command.thread_id, canonical_cycle.id as canonical_cycle_id,
      legacy_session.id as legacy_session_id,
      legacy_session.revision as legacy_session_revision
    from provider_effects effect
    inner join bot_action_commands command
      on command.id=effect.command_id and command.tenant_id=effect.tenant_id
      and command.store_id=effect.store_id
      and command.provider_connection_id=effect.provider_connection_id
      and command.provider=effect.provider
    inner join crm_conversation_threads thread
      on thread.id=command.thread_id and thread.tenant_id=command.tenant_id
      and thread.store_id=command.store_id
      and thread.provider_connection_id=command.provider_connection_id
      and thread.revision=command.expected_revision and thread.state='open'
    inner join crm_channel_connections connection
      on connection.id=effect.provider_connection_id
      and connection.tenant_id=effect.tenant_id
      and connection.store_id=effect.store_id
      and connection.provider=effect.provider and connection.state='active'
    inner join integration_accounts account
      on account.id=(command.input->>'integrationId')::uuid
      and account.tenant_id=effect.tenant_id and account.store_id=effect.store_id
      and account.status='active' and account.provider='crm_whatsapp_bot'
    inner join store_entitlements entitlement
      on entitlement.tenant_id=effect.tenant_id
      and entitlement.store_id=effect.store_id
      and entitlement.feature_key='crm'
      and entitlement.status in ('active','trialing')
      and (entitlement.starts_at is null or entitlement.starts_at<=now())
      and (entitlement.ends_at is null or entitlement.ends_at>now())
    inner join lateral (
      select session.id, session.external_session_id, session.revision
      from crm_whatsapp_sessions session
      where session.tenant_id=effect.tenant_id
        and session.store_id=effect.store_id
        and session.connection_id=effect.provider_connection_id
        and session.status not in ('HUMAN_TAKEOVER','COMPLETED','EXPIRED')
        and session.human_attendance_state is null
        and (
          session.id::text=thread.metadata->>'legacy_session_id'
          or coalesce(session.channel_external_id, session.buyer_chat_lid,
            session.external_session_id, session.buyer_phone)=thread.external_thread_id
        )
      order by (session.id::text=thread.metadata->>'legacy_session_id') desc,
        session.updated_at desc
      limit 1
    ) legacy_session on true
    inner join lateral (
      select cycle.id
      from crm_conversation_cycles cycle
      where cycle.thread_id=thread.id and cycle.tenant_id=thread.tenant_id
        and cycle.store_id=thread.store_id
        and (
          cycle.id=legacy_session.id
          or cycle.external_cycle_id=legacy_session.id::text
          or cycle.external_cycle_id=legacy_session.external_session_id
          or cycle.metadata->>'legacy_session_id'=legacy_session.id::text
          or (
            cycle.state='active'
            and not exists (
              select 1 from crm_conversation_cycles mapped_cycle
              where mapped_cycle.thread_id=thread.id
                and mapped_cycle.tenant_id=thread.tenant_id
                and mapped_cycle.store_id=thread.store_id
                and (
                  mapped_cycle.id=legacy_session.id
                  or mapped_cycle.external_cycle_id=legacy_session.id::text
                  or mapped_cycle.external_cycle_id=legacy_session.external_session_id
                  or mapped_cycle.metadata->>'legacy_session_id'=legacy_session.id::text
                )
            )
            and 1=(
              select count(*) from crm_conversation_cycles active_cycle
              where active_cycle.thread_id=thread.id
                and active_cycle.tenant_id=thread.tenant_id
                and active_cycle.store_id=thread.store_id
                and active_cycle.state='active'
            )
          )
        )
      order by case
        when cycle.id=legacy_session.id then 0
        when cycle.external_cycle_id=legacy_session.id::text then 1
        when cycle.external_cycle_id=legacy_session.external_session_id then 2
        when cycle.metadata->>'legacy_session_id'=legacy_session.id::text then 3
        else 4 end
      limit 1
    ) canonical_cycle on true
    left join crm_conversation_attendances attendance
      on attendance.thread_id=thread.id and attendance.tenant_id=thread.tenant_id
      and attendance.store_id=thread.store_id
      and attendance.cycle_id=canonical_cycle.id
    where effect.id=${effectId}::uuid and effect.state in ('claimed','executing')
      and command.state in ('executing','retryable_failed')
      and command.authorization_class='automatic'
      and command.action_type in ('message.send','handoff.request')
      and coalesce(attendance.state, 'bot_active')='bot_active'
      and not exists (
        select 1 from crm_external_bot_kill_switches switch
        where switch.enabled=true and (
          switch.level='global'
          or (switch.level='tenant' and switch.scope_value=effect.tenant_id::text)
          or (switch.level='store' and switch.scope_value=effect.store_id::text)
          or (switch.level='integration' and switch.scope_value=command.input->>'integrationId')
          or (switch.level='connection' and switch.scope_value=effect.provider_connection_id::text)
          or (switch.level='thread' and switch.scope_value=command.thread_id::text)
          or (switch.level='provider' and switch.scope_value=effect.provider::text)
          or (switch.level='action' and switch.action_type=command.action_type)
          or (switch.level='action_class' and switch.scope_value='effect')
          or (switch.level='model_version' and switch.scope_value=command.input->>'modelVersion')
          or switch.level='pii_export'
        )
      )
    limit 1
  `);
  const row = (rows as unknown as ExternalBotRow[])[0];
  return row ? mapEffect(row) : null;
}

function mapEffect(row: ExternalBotRow): AuthorizedExternalBotEffect | null {
  const input = readRecord(row.input);
  const command = readRecord(input.command);
  const payload = readRecord(command.payload);
  const action = String(row.action_type);
  if (action === "message.send" && typeof payload.text === "string") {
    return baseEffect(row, input, { action, payload: { text: payload.text } });
  }
  if (action === "handoff.request" && typeof payload.reason === "string") {
    return baseEffect(row, input, {
      action,
      payload: { reason: payload.reason },
    });
  }
  return null;
}

function baseEffect(
  row: ExternalBotRow,
  input: Record<string, unknown>,
  command: AuthorizedExternalBotEffect["command"],
): AuthorizedExternalBotEffect {
  return {
    canonicalCycleId: String(row.canonical_cycle_id),
    command,
    effectId: String(row.id),
    expectedRevision: Number(row.expected_revision),
    idempotencyKey: String(row.idempotency_key),
    integrationId: String(input.integrationId),
    legacySessionId: String(row.legacy_session_id),
    legacySessionRevision: Number(row.legacy_session_revision),
    modelVersion: String(input.modelVersion),
    provider: row.provider as AuthorizedExternalBotEffect["provider"],
    providerConnectionId: String(row.provider_connection_id),
    storeId: String(row.store_id),
    tenantId: String(row.tenant_id),
    threadId: String(row.thread_id),
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
