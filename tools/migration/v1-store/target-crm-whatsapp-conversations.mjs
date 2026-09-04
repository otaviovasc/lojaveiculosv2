import { progress } from "./log.mjs";

export async function seedCanonicalWhatsappConversations(
  tx,
  conversations,
  batchSize = 250,
) {
  for (let offset = 0; offset < conversations.length; offset += batchSize) {
    const batch = conversations.slice(offset, offset + batchSize);
    await seedThreads(
      tx,
      batch.map((item) => item.thread),
    );
    await seedCycles(
      tx,
      batch.map((item) => item.cycle),
    );
    await seedAttendances(
      tx,
      batch.map((item) => item.attendance),
    );
    progress(
      "  CRM WhatsApp canonical conversations",
      Math.min(offset + batch.length, conversations.length),
      conversations.length,
    );
  }
}

async function seedThreads(tx, rows) {
  await tx`INSERT INTO crm_conversation_threads ${tx(
    rows,
    "id",
    "channel",
    "channel_metadata",
    "customer_chat_id",
    "customer_display_name",
    "customer_phone",
    "external_thread_id",
    "last_message_at",
    "metadata",
    "profile_photo_url",
    "provider_connection_id",
    "source",
    "state",
    "store_id",
    "tenant_id",
    "created_at",
    "updated_at",
  )}
    ON CONFLICT (id) DO UPDATE SET
      channel_metadata=excluded.channel_metadata,
      customer_chat_id=excluded.customer_chat_id,
      customer_display_name=excluded.customer_display_name,
      customer_phone=excluded.customer_phone,
      external_thread_id=excluded.external_thread_id,
      last_message_at=excluded.last_message_at,
      metadata=excluded.metadata,
      profile_photo_url=excluded.profile_photo_url,
      source=excluded.source,
      state=excluded.state,
      updated_at=excluded.updated_at`;
}

async function seedCycles(tx, rows) {
  await tx`INSERT INTO crm_conversation_cycles ${tx(
    rows,
    "id",
    "assigned_user_id",
    "external_cycle_id",
    "first_handled_at",
    "fresh_lead_at",
    "last_customer_read_at",
    "last_message_at",
    "last_message_content",
    "last_read_at",
    "message_count",
    "metadata",
    "state",
    "store_id",
    "tenant_id",
    "thread_id",
    "created_at",
    "updated_at",
  )}
    ON CONFLICT (id) DO UPDATE SET
      assigned_user_id=excluded.assigned_user_id,
      external_cycle_id=excluded.external_cycle_id,
      first_handled_at=excluded.first_handled_at,
      fresh_lead_at=excluded.fresh_lead_at,
      last_customer_read_at=excluded.last_customer_read_at,
      last_message_at=excluded.last_message_at,
      last_message_content=excluded.last_message_content,
      last_read_at=excluded.last_read_at,
      message_count=excluded.message_count,
      metadata=excluded.metadata,
      state=excluded.state,
      updated_at=excluded.updated_at`;
}

async function seedAttendances(tx, rows) {
  await tx`INSERT INTO crm_conversation_attendances ${tx(
    rows,
    "id",
    "assigned_at",
    "assigned_user_id",
    "changed_at",
    "cycle_id",
    "handling_started_at",
    "handoff_requested_at",
    "history_started_at",
    "state",
    "state_version",
    "store_id",
    "tenant_id",
    "thread_id",
    "created_at",
    "updated_at",
  )}
    ON CONFLICT (id) DO UPDATE SET
      assigned_at=excluded.assigned_at,
      assigned_user_id=excluded.assigned_user_id,
      changed_at=excluded.changed_at,
      handling_started_at=excluded.handling_started_at,
      handoff_requested_at=excluded.handoff_requested_at,
      history_started_at=excluded.history_started_at,
      state=excluded.state,
      state_version=excluded.state_version,
      updated_at=excluded.updated_at`;
}
