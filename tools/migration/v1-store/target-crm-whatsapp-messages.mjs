import { nullableString, targetId } from "./common.mjs";
import { progress } from "./log.mjs";

const BATCH_SIZE = 500;
const MESSAGE_TYPES = new Set([
  "AUDIO",
  "CATALOG",
  "CONTACT",
  "DOCUMENT",
  "IMAGE",
  "INTERACTIVE",
  "LOCATION",
  "STICKER",
  "TEMPLATE",
  "TEXT",
  "VIDEO",
]);
const MESSAGE_STATUSES = new Set([
  "DELIVERED",
  "FAILED",
  "PENDING",
  "READ",
  "SENT",
]);
const SENDER_TYPES = new Set(["AI", "CUSTOMER", "HUMAN"]);

export async function seedWhatsappMessages(tx, source, config, sessionIds) {
  const externalIds = new Map();
  const rows = source.messages.map((message) => {
    const sessionId = sessionIds.get(message.chat_session_id);
    if (!sessionId)
      throw new Error(
        `Missing WhatsApp session mapping for Repasses message ${message.id}.`,
      );
    return toMessageRow(tx, message, config, sessionId, externalIds);
  });

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    await tx`INSERT INTO crm_whatsapp_messages ${tx(
      batch,
      "id",
      "channel",
      "channel_message_id",
      "connection_id",
      "content",
      "deleted_at",
      "direction",
      "external_id",
      "media_type",
      "media_url",
      "metadata",
      "provider_timestamp",
      "sender_type",
      "session_id",
      "status",
      "store_id",
      "tenant_id",
      "type",
      "created_at",
      "updated_at",
    )}
      ON CONFLICT (id) DO UPDATE SET
        channel_message_id=excluded.channel_message_id,
        content=excluded.content,
        deleted_at=excluded.deleted_at,
        external_id=excluded.external_id,
        media_type=excluded.media_type,
        media_url=excluded.media_url,
        metadata=excluded.metadata,
        provider_timestamp=excluded.provider_timestamp,
        status=excluded.status,
        updated_at=excluded.updated_at`;
    progress(
      "  CRM WhatsApp messages",
      Math.min(offset + batch.length, rows.length),
      rows.length,
    );
  }
}

function toMessageRow(tx, message, config, sessionId, externalIds) {
  const connectionId = config.crmConnectionIds.get(message.connection_id);
  if (!connectionId)
    throw new Error(
      `Missing WhatsApp connection mapping for Repasses message ${message.id}.`,
    );
  const externalId = uniqueExternalId(message, sessionId, externalIds);
  return {
    channel: message.channel ?? "WHATSAPP",
    channel_message_id: nullableString(message.channel_message_id, 191),
    connection_id: connectionId,
    content: String(message.content ?? ""),
    created_at: message.created_at,
    deleted_at: message.deleted_at,
    direction: message.direction,
    external_id: externalId,
    id: targetId(config.legacyStoreId, "RepassesMessage", message.id),
    media_type: nullableString(message.media_type, 120),
    media_url: nullableString(message.media_url),
    metadata: tx.json({
      legacyRepasses: {
        senderAgentId: message.sender_agent_id ?? null,
        sourceId: String(message.id),
        sourceSessionId: String(message.chat_session_id),
        sourceTable: "messages",
        sourceUuid: message.uuid,
      },
    }),
    provider_timestamp: message.provider_timestamp ?? message.created_at,
    sender_type: mapSenderType(message),
    session_id: sessionId,
    status: MESSAGE_STATUSES.has(message.status) ? message.status : "PENDING",
    store_id: config.storeId,
    tenant_id: config.tenantId,
    type: MESSAGE_TYPES.has(message.type) ? message.type : "TEXT",
    updated_at: message.updated_at ?? message.created_at,
  };
}

function uniqueExternalId(message, sessionId, usedBySession) {
  const used = usedBySession.get(sessionId) ?? new Set();
  usedBySession.set(sessionId, used);
  const preferred = nullableString(message.external_id, 191) ?? message.uuid;
  if (!used.has(preferred)) {
    used.add(preferred);
    return preferred;
  }
  const fallback = `legacy:${message.uuid ?? message.id}`.slice(0, 191);
  used.add(fallback);
  return fallback;
}

function mapSenderType(message) {
  if (SENDER_TYPES.has(message.sender_type)) return message.sender_type;
  return message.direction === "INBOUND" ? "CUSTOMER" : "HUMAN";
}
