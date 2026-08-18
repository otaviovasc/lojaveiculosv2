import { sql } from "drizzle-orm";
import type {
  ExternalBotDb,
  ExternalBotRow,
} from "./drizzleExternalBotShared.js";
import {
  mapAuthorizedExternalBotEffect,
  type AuthorizedExternalBotEffect,
} from "./drizzleExternalBotEffectRuntimeMapping.js";
export type { AuthorizedExternalBotEffect } from "./drizzleExternalBotEffectRuntimeMapping.js";
export {
  ExternalBotCanonicalSyncIndeterminateError,
  synchronizeExternalBotEffectOutcome,
} from "./drizzleExternalBotEffectSynchronization.js";

export async function loadAuthorizedExternalBotEffect(
  db: ExternalBotDb,
  effectId: string,
  options: { markProviderAttempt?: boolean } = {},
): Promise<AuthorizedExternalBotEffect | null> {
  const markProviderAttempt = options.markProviderAttempt ?? true;
  const attemptRows = markProviderAttempt
    ? await db.execute(sql`update crm_external_bot_provider_effects
        set provider_attempted_at=now(), updated_at=now()
        where id=${effectId}::uuid and state in ('claimed','executing')
          and provider_attempted_at is null returning id`)
    : [];
  const firstAttempt =
    !markProviderAttempt ||
    (attemptRows as unknown as ExternalBotRow[]).length === 1;
  const rows = await db.execute(sql`
    select effect.id,effect.idempotency_key,effect.provider,
      effect.provider_connection_id,effect.store_id,effect.tenant_id,
      command.action_type,command.expected_attendance_revision,
      command.expected_revision,command.input,
      command.request_digest,
      command.thread_id,cycle.id as canonical_cycle_id,
      connection.broker,connection.channel,connection.display_name,
      connection.external_connection_id,connection.external_instance_id,
      connection.metadata as connection_metadata,connection.state as connection_state,
      connection.webhook_url,
      case when connection.channel='whatsapp'
        then coalesce(nullif(thread.customer_phone,''),nullif(thread.external_thread_id,''))
        else coalesce(nullif(thread.customer_chat_id,''),nullif(thread.external_thread_id,''))
      end as provider_address,
      synchronized.provider_message_id as synchronized_provider_operation_id,
      synchronized.occurred_at as synchronized_occurred_at
    from crm_external_bot_provider_effects effect
    inner join crm_external_bot_action_commands command
      on command.id=effect.command_id and command.tenant_id=effect.tenant_id
      and command.store_id=effect.store_id
      and command.provider_connection_id=effect.provider_connection_id
      and command.provider=effect.provider
    inner join crm_external_bot_grants grant
      on grant.id=command.grant_id and grant.tenant_id=command.tenant_id
      and grant.store_id=command.store_id and grant.thread_id=command.thread_id
      and grant.provider_connection_id=command.provider_connection_id
      and grant.provider=command.provider and grant.action_type=command.action_type
      and (grant.action_class=command.authorization_class
        or (grant.action_class='proposal_only' and command.authorization_class='human_approved'))
      and grant.state='consumed'
      and (grant.expires_at>now() or command.authorization_class='human_approved')
      and grant.integration_id=(command.input->>'integrationId')::uuid
      and grant.model_version=command.input->>'modelVersion'
    inner join crm_conversation_threads thread
      on thread.id=command.thread_id and thread.tenant_id=command.tenant_id
      and thread.store_id=command.store_id
      and thread.provider_connection_id=command.provider_connection_id
      and thread.state='open'
    inner join tenants tenant on tenant.id=thread.tenant_id and tenant.deleted_at is null
    inner join stores store on store.id=thread.store_id and store.tenant_id=thread.tenant_id and store.deleted_at is null
    inner join crm_channel_connections connection
      on connection.id=thread.provider_connection_id
      and connection.tenant_id=thread.tenant_id
      and connection.store_id=thread.store_id
      and connection.provider=effect.provider and connection.channel=thread.channel
    inner join crm_channel_routing_policies routing
      on routing.tenant_id=thread.tenant_id and routing.store_id=thread.store_id
      and routing.channel=thread.channel and routing.external_bot_mode<>'disabled'
      and ((routing.external_bot_mode='inherit_store_default'
          and routing.default_connection_id=connection.id)
        or (routing.external_bot_mode='explicit_connection'
          and routing.external_bot_connection_id=connection.id))
    inner join integration_accounts account
      on account.id=grant.integration_id and account.tenant_id=effect.tenant_id
      and account.store_id=effect.store_id and account.status='active'
      and account.provider='crm_external_bot'
    inner join store_entitlements entitlement
      on entitlement.tenant_id=effect.tenant_id
      and entitlement.store_id=effect.store_id
      and entitlement.feature_key='crm'
      and entitlement.status in ('active','trialing')
      and (entitlement.starts_at is null or entitlement.starts_at<=now())
      and (entitlement.ends_at is null or entitlement.ends_at>now())
    inner join lateral (
      select candidate.id
      from crm_conversation_cycles candidate
      where candidate.thread_id=thread.id and candidate.tenant_id=thread.tenant_id
        and candidate.store_id=thread.store_id and candidate.state='active'
        and candidate.revision=command.expected_revision
        and 1=(select count(*) from crm_conversation_cycles active_cycle
          where active_cycle.thread_id=thread.id
            and active_cycle.tenant_id=thread.tenant_id
            and active_cycle.store_id=thread.store_id
            and active_cycle.state='active')
      limit 1
    ) cycle on true
    inner join crm_conversation_attendances attendance
      on attendance.thread_id=thread.id and attendance.tenant_id=thread.tenant_id
      and attendance.store_id=thread.store_id and attendance.cycle_id=cycle.id
      and attendance.state_version=command.expected_attendance_revision
    left join lateral (
      select message.provider_message_id,message.occurred_at
      from crm_messages message
      where message.tenant_id=effect.tenant_id and message.store_id=effect.store_id
        and message.thread_id=thread.id and message.cycle_id=cycle.id
        and message.provider_connection_id=connection.id
        and message.direction='outbound' and message.sender='bot'
        and message.metadata->>'external_bot_effect_id'=effect.id::text
        and message.metadata->>'external_bot_idempotency_key'=effect.idempotency_key
        and message.provider_message_id is not null
      limit 1
    ) synchronized on true
    where effect.id=${effectId}::uuid and effect.state in ('claimed','executing')
      and command.state in ('executing','retryable_failed')
      and command.authorization_class in ('automatic','human_approved')
      and command.action_type in ('message.send_text','message.send_media','message.send_template')
      and command.input->>'channel'=thread.channel::text
      and nullif(case when connection.channel='whatsapp'
        then coalesce(thread.customer_phone,thread.external_thread_id)
        else coalesce(thread.customer_chat_id,thread.external_thread_id) end,'') is not null
      and (attendance.state='bot_active'
        or synchronized.provider_message_id is not null)
      and (${firstAttempt}
        or synchronized.provider_message_id is not null)
      and not exists (
        select 1 from crm_external_bot_kill_switches switch
        where switch.enabled=true and (
          switch.level='global'
          or (switch.level='tenant' and switch.scope_value=effect.tenant_id::text)
          or (switch.level='store' and switch.scope_value=effect.store_id::text)
          or (switch.level='integration' and switch.scope_value=grant.integration_id::text)
          or (switch.level='connection' and switch.scope_value=connection.id::text)
          or (switch.level='thread' and switch.scope_value=thread.id::text)
          or (switch.level='provider' and switch.scope_value=effect.provider::text)
          or (switch.level='action' and switch.action_type=command.action_type)
          or (switch.level='action_class' and switch.scope_value='effect')
          or (switch.level='model_version' and switch.scope_value=grant.model_version)
          or switch.level='pii_export'))
    limit 1
  `);
  const row = (rows as unknown as ExternalBotRow[])[0];
  const effect = row ? mapAuthorizedExternalBotEffect(row) : null;
  if (!effect && markProviderAttempt && firstAttempt) {
    await db.execute(sql`update crm_external_bot_provider_effects
      set provider_attempted_at=null, updated_at=now()
      where id=${effectId}::uuid and state in ('claimed','executing')`);
  }
  return effect;
}

export async function wasExternalBotProviderAttempted(
  db: ExternalBotDb,
  effectId: string,
) {
  const rows = await db.execute(sql`select id
    from crm_external_bot_provider_effects
    where id=${effectId}::uuid and provider_attempted_at is not null
    limit 1`);
  return (rows as unknown as ExternalBotRow[]).length === 1;
}
