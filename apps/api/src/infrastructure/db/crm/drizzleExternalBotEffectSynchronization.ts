import { sql } from "drizzle-orm";
import type {
  ExternalBotDb,
  ExternalBotRow,
} from "./drizzleExternalBotShared.js";
import type { AuthorizedExternalBotEffect } from "./drizzleExternalBotEffectRuntime.js";

export async function synchronizeExternalBotEffectOutcome(
  db: ExternalBotDb,
  input: { effect: AuthorizedExternalBotEffect; legacyMessageId?: string },
) {
  try {
    if (input.legacyMessageId) await syncCanonicalMessage(db, input);
    if (input.effect.command.action === "handoff.request") {
      await syncCanonicalHandoff(db, input.effect);
    }
  } catch (error) {
    if (error instanceof ExternalBotCanonicalSyncIndeterminateError) {
      throw error;
    }
    throw new ExternalBotCanonicalSyncIndeterminateError(error);
  }
}

async function syncCanonicalMessage(
  db: ExternalBotDb,
  input: { effect: AuthorizedExternalBotEffect; legacyMessageId?: string },
) {
  await db.execute(sql`insert into crm_messages
    (id,created_at,updated_at,content,cycle_id,direction,media_type,media_url,
      message_type,metadata,occurred_at,provider,provider_connection_id,
      provider_message_id,revision,sender,status,thread_id,tenant_id,store_id)
    select message.id,message.created_at,message.updated_at,message.content,
      ${input.effect.canonicalCycleId}::uuid,'outbound',message.media_type,
      message.media_url,lower(message.type::text),message.metadata ||
        jsonb_build_object(
          'external_bot_effect_id',${input.effect.effectId}::text,
          'external_bot_idempotency_key',${input.effect.idempotencyKey}::text,
          'legacy_session_id',${input.effect.legacySessionId}::text
        ),
      coalesce(message.provider_timestamp,message.created_at),
      ${input.effect.provider},${input.effect.providerConnectionId}::uuid,
      coalesce(message.channel_message_id,message.external_id),0,'bot',
      lower(message.status::text)::canonical_message_status,
      ${input.effect.threadId}::uuid,${input.effect.tenantId}::uuid,
      ${input.effect.storeId}::uuid
    from crm_whatsapp_messages message
    where message.id=${input.legacyMessageId}::uuid
      and message.session_id=${input.effect.legacySessionId}::uuid
      and message.connection_id=${input.effect.providerConnectionId}::uuid
      and message.tenant_id=${input.effect.tenantId}::uuid
      and message.store_id=${input.effect.storeId}::uuid
    on conflict do nothing`);

  const verified = await db.execute(sql`select canonical.id
    from crm_messages canonical
    inner join crm_whatsapp_messages message
      on message.id=${input.legacyMessageId}::uuid
      and message.session_id=${input.effect.legacySessionId}::uuid
      and message.connection_id=${input.effect.providerConnectionId}::uuid
      and message.tenant_id=${input.effect.tenantId}::uuid
      and message.store_id=${input.effect.storeId}::uuid
    where (
        canonical.id=message.id
        or (
          coalesce(message.channel_message_id,message.external_id) is not null
          and canonical.provider_connection_id=${input.effect.providerConnectionId}::uuid
          and canonical.provider_message_id=coalesce(message.channel_message_id,message.external_id)
        )
      )
      and canonical.cycle_id=${input.effect.canonicalCycleId}::uuid
      and canonical.direction='outbound' and canonical.sender='bot'
      and canonical.provider=${input.effect.provider}
      and canonical.provider_connection_id=${input.effect.providerConnectionId}::uuid
      and canonical.thread_id=${input.effect.threadId}::uuid
      and canonical.tenant_id=${input.effect.tenantId}::uuid
      and canonical.store_id=${input.effect.storeId}::uuid
    limit 2`);
  if ((verified as unknown as ExternalBotRow[]).length !== 1) {
    throw new ExternalBotCanonicalSyncIndeterminateError();
  }
}

async function syncCanonicalHandoff(
  db: ExternalBotDb,
  effect: AuthorizedExternalBotEffect,
) {
  await db.execute(sql`update crm_conversation_attendances
    set state='handoff_requested',revision=revision+1,changed_at=now(),updated_at=now()
    where thread_id=${effect.threadId}::uuid
      and cycle_id=${effect.canonicalCycleId}::uuid
      and tenant_id=${effect.tenantId}::uuid and store_id=${effect.storeId}::uuid
      and state='bot_active'`);
}

export class ExternalBotCanonicalSyncIndeterminateError extends Error {
  readonly code = "canonical_sync_indeterminate";

  constructor(cause?: unknown) {
    super("Canonical CRM bot outcome is pending reconciliation.", { cause });
    this.name = "ExternalBotCanonicalSyncIndeterminateError";
  }
}
