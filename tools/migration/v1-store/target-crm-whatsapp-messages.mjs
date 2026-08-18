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

export async function seedWhatsappMessages(
  tx,
  source,
  config,
  conversationIds,
) {
  const providerMessageIds = new Map();
  const rows = source.messages.map((message) => {
    const cycleId = conversationIds.cycleIds.get(message.chat_session_id);
    const threadId = conversationIds.threadIds.get(message.chat_session_id);
    if (!cycleId || !threadId)
      throw new Error(
        `Missing WhatsApp session mapping for Repasses message ${message.id}.`,
      );
    return toMessageRow(
      tx,
      message,
      config,
      cycleId,
      threadId,
      providerMessageIds,
    );
  });

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    await tx`INSERT INTO crm_messages ${tx(
      batch,
      "id",
      "content",
      "cycle_id",
      "deleted_at",
      "direction",
      "media_type",
      "media_url",
      "message_type",
      "metadata",
      "occurred_at",
      "provider",
      "provider_connection_id",
      "provider_message_id",
      "sender",
      "sender_origin",
      "status",
      "store_id",
      "tenant_id",
      "thread_id",
      "created_at",
      "updated_at",
    )}
      ON CONFLICT (id) DO UPDATE SET
        content=excluded.content,
        deleted_at=excluded.deleted_at,
        media_type=excluded.media_type,
        media_url=excluded.media_url,
        message_type=excluded.message_type,
        metadata=excluded.metadata,
        occurred_at=excluded.occurred_at,
        provider_message_id=excluded.provider_message_id,
        sender=excluded.sender,
        sender_origin=excluded.sender_origin,
        status=excluded.status,
        updated_at=excluded.updated_at`;
    progress(
      "  CRM WhatsApp messages",
      Math.min(offset + batch.length, rows.length),
      rows.length,
    );
  }
}

export function toCanonicalMessageRow(
  tx,
  message,
  config,
  cycleId,
  threadId,
  providerMessageIds,
) {
  const connectionId = config.crmChannelConnectionIds.get(
    message.connection_id,
  );
  if (!connectionId)
    throw new Error(
      `Missing WhatsApp connection mapping for Repasses message ${message.id}.`,
    );
  const providerMessageId = uniqueProviderMessageId(
    message,
    connectionId,
    providerMessageIds,
  );
  return {
    content: String(message.content ?? ""),
    created_at: message.created_at,
    cycle_id: cycleId,
    deleted_at: message.deleted_at,
    direction: message.direction === "INBOUND" ? "inbound" : "outbound",
    id: targetId(config.legacyStoreId, "RepassesMessage", message.id),
    media_type: nullableString(message.media_type, 120),
    media_url: nullableString(message.media_url),
    message_type: MESSAGE_TYPES.has(message.type) ? message.type : "TEXT",
    metadata: tx.json({
      channelMessageId: nullableString(message.channel_message_id, 191),
      providerMetadata: {
        legacyRepasses: {
          channel: message.channel ?? "WHATSAPP",
          senderAgentId: message.sender_agent_id ?? null,
          sourceId: String(message.id),
          sourceSessionId: String(message.chat_session_id),
          sourceTable: "messages",
          sourceUuid: message.uuid,
        },
      },
      ...(message.provider_timestamp ? {} : { providerTimestampCleared: true }),
    }),
    occurred_at: message.provider_timestamp ?? message.created_at,
    provider: "zapi",
    provider_connection_id: connectionId,
    provider_message_id: providerMessageId,
    sender: mapSender(message),
    sender_origin: mapSenderOrigin(message),
    status: MESSAGE_STATUSES.has(message.status)
      ? message.status.toLowerCase()
      : "pending",
    store_id: config.storeId,
    tenant_id: config.tenantId,
    thread_id: threadId,
    updated_at: message.updated_at ?? message.created_at,
  };
}

function toMessageRow(...args) {
  return toCanonicalMessageRow(...args);
}

function uniqueProviderMessageId(message, connectionId, usedByConnection) {
  const used = usedByConnection.get(connectionId) ?? new Set();
  usedByConnection.set(connectionId, used);
  const preferred =
    nullableString(message.external_id, 191) ??
    nullableString(message.uuid, 191) ??
    `legacy:${message.id}`;
  if (!used.has(preferred)) {
    used.add(preferred);
    return preferred;
  }
  const fallback = `legacy:${message.uuid ?? message.id}`.slice(0, 191);
  if (used.has(fallback))
    throw new Error(
      `Duplicate provider message identity for Repasses message ${message.id}.`,
    );
  used.add(fallback);
  return fallback;
}

function mapSender(message) {
  const senderType = SENDER_TYPES.has(message.sender_type)
    ? message.sender_type
    : message.direction === "INBOUND"
      ? "CUSTOMER"
      : "HUMAN";
  if (senderType === "AI") return "bot";
  if (senderType === "CUSTOMER") return "customer";
  return "human";
}

function mapSenderOrigin(message) {
  const sender = mapSender(message);
  if (sender === "customer") return "customer";
  if (sender === "bot") return "external_bot";
  if (sender === "human") return "human_crm";
  return "unknown";
}
