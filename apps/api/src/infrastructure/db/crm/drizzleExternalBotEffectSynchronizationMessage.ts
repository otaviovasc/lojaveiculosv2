import { sql } from "drizzle-orm";
import type { ExternalBotDb } from "./drizzleExternalBotShared.js";
import type { AuthorizedExternalBotEffect } from "./drizzleExternalBotEffectRuntime.js";
import {
  assertExactlyOne,
  type ExternalBotProviderOperation,
} from "./drizzleExternalBotEffectSynchronizationSupport.js";

export async function synchronizeCanonicalMessage(
  db: ExternalBotDb,
  effect: AuthorizedExternalBotEffect,
  providerOperation: ExternalBotProviderOperation,
) {
  const message = canonicalMessage(effect);
  const occurredAt = providerOperation.occurredAt.toISOString();
  const metadata = JSON.stringify({
    external_bot_effect_id: effect.effectId,
    external_bot_idempotency_key: effect.idempotencyKey,
    external_bot_integration_id: effect.integrationId,
    external_bot_model_version: effect.modelVersion,
    provider_operation_id: providerOperation.id,
  });
  await db.execute(sql`
    insert into crm_messages
      (id,content,cycle_id,direction,media_type,media_url,message_type,metadata,occurred_at,provider,
       provider_connection_id,provider_message_id,sender,sender_origin,status,thread_id,
       tenant_id,store_id)
    values (${effect.effectId}::uuid,${message.content},
      ${effect.canonicalCycleId}::uuid,'outbound',${message.mediaType},${message.mediaUrl},
      ${message.messageType},${metadata}::jsonb,
      ${occurredAt}::timestamptz,${effect.provider},
      ${effect.providerConnectionId}::uuid,${providerOperation.id},'bot','external_bot','sent',
      ${effect.threadId}::uuid,${effect.tenantId}::uuid,${effect.storeId}::uuid)
    on conflict do nothing`);

  await db.execute(sql`
    update crm_messages set
      content=${message.content},message_type=${message.messageType},
      media_type=${message.mediaType},media_url=${message.mediaUrl},metadata=metadata || ${metadata}::jsonb,
      occurred_at=${occurredAt}::timestamptz,sender='bot',sender_origin='external_bot',
      status=case when status in ('delivered','read') then status else 'sent' end,
      updated_at=now()
    where tenant_id=${effect.tenantId}::uuid and store_id=${effect.storeId}::uuid
      and thread_id=${effect.threadId}::uuid
      and cycle_id=${effect.canonicalCycleId}::uuid
      and provider=${effect.provider}
      and provider_connection_id=${effect.providerConnectionId}::uuid
      and direction='outbound'
      and provider_message_id=${providerOperation.id}
      and sender<>'human'
      and sender_origin not in ('human_crm','human_channel')
      and (metadata->>'external_bot_effect_id' is null
        or metadata->>'external_bot_effect_id'=${effect.effectId})
      and (metadata->>'external_bot_idempotency_key' is null
        or metadata->>'external_bot_idempotency_key'=${effect.idempotencyKey})`);

  const verified = await db.execute(sql`
    select id from crm_messages
    where tenant_id=${effect.tenantId}::uuid and store_id=${effect.storeId}::uuid
      and thread_id=${effect.threadId}::uuid
      and cycle_id=${effect.canonicalCycleId}::uuid
      and provider=${effect.provider}
      and provider_connection_id=${effect.providerConnectionId}::uuid
      and provider_message_id=${providerOperation.id}
      and direction='outbound' and sender='bot' and sender_origin='external_bot'
      and status in ('sent','delivered','read')
      and metadata->>'external_bot_effect_id'=${effect.effectId}
      and metadata->>'external_bot_idempotency_key'=${effect.idempotencyKey}
    limit 2`);
  assertExactlyOne(verified);

  await synchronizeCanonicalMessagePreview(
    db,
    effect,
    providerOperation,
    message.content,
  );
}

function canonicalMessage(effect: AuthorizedExternalBotEffect) {
  if (effect.command.action === "message.send_text") {
    return {
      content: effect.command.payload.text,
      mediaType: null,
      mediaUrl: null,
      messageType: "text",
    };
  }
  if (effect.command.action === "message.send_media") {
    return {
      content:
        effect.command.payload.caption?.trim() ||
        `[${effect.command.payload.mediaType}]`,
      mediaType: effect.command.payload.mediaType,
      mediaUrl: effect.command.payload.mediaUrl,
      messageType: effect.command.payload.mediaType,
    };
  }
  if (effect.command.action === "handoff.request") {
    return {
      content: effect.command.payload.reason,
      mediaType: null,
      mediaUrl: null,
      messageType: "text",
    };
  }
  return {
    content: `Template: ${effect.command.payload.templateName}`,
    mediaType: null,
    mediaUrl: null,
    messageType: "template",
  };
}

async function synchronizeCanonicalMessagePreview(
  db: ExternalBotDb,
  effect: AuthorizedExternalBotEffect,
  providerOperation: ExternalBotProviderOperation,
  text: string,
) {
  const occurredAt = providerOperation.occurredAt.toISOString();
  await db.execute(sql`
    with marked as (
      update crm_messages message
      set metadata=message.metadata || '{"external_bot_preview_synchronized":true}'::jsonb,
        updated_at=now()
      where message.tenant_id=${effect.tenantId}::uuid
        and message.store_id=${effect.storeId}::uuid
        and message.thread_id=${effect.threadId}::uuid
        and message.cycle_id=${effect.canonicalCycleId}::uuid
        and message.provider_connection_id=${effect.providerConnectionId}::uuid
        and message.provider_message_id=${providerOperation.id}
        and message.sender='bot' and message.sender_origin='external_bot'
        and message.metadata->>'external_bot_effect_id'=${effect.effectId}
        and coalesce((message.metadata->>'external_bot_preview_synchronized')::boolean,false)=false
      returning message.id
    ), cycle_update as (
      update crm_conversation_cycles cycle
      set last_message_at=case
          when cycle.last_message_at is null or ${occurredAt}::timestamptz>cycle.last_message_at
          then ${occurredAt}::timestamptz else cycle.last_message_at end,
        last_message_content=case
          when cycle.last_message_at is null or ${occurredAt}::timestamptz>cycle.last_message_at
          then ${text} else cycle.last_message_content end,
        message_count=cycle.message_count+1,revision=cycle.revision+1,updated_at=now()
      where cycle.id=${effect.canonicalCycleId}::uuid
        and cycle.thread_id=${effect.threadId}::uuid
        and cycle.tenant_id=${effect.tenantId}::uuid
        and cycle.store_id=${effect.storeId}::uuid
        and exists (select 1 from marked)
      returning cycle.id
    )
    update crm_conversation_threads thread
    set last_message_at=case
        when thread.last_message_at is null or ${occurredAt}::timestamptz>thread.last_message_at
        then ${occurredAt}::timestamptz else thread.last_message_at end,
      revision=thread.revision+1,updated_at=now()
    where thread.id=${effect.threadId}::uuid
      and thread.tenant_id=${effect.tenantId}::uuid
      and thread.store_id=${effect.storeId}::uuid
      and exists (select 1 from cycle_update)`);
}
