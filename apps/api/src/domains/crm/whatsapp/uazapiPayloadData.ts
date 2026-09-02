import { readRecord, readString } from "./zapiPayloadRead.js";

/**
 * Uazapi webhook envelope: { event, instance, instanceName?, data, EventType? }.
 * `event` is singular ("message") while the subscription list is plural
 * ("messages"). Some deployments flatten message fields to the top level or
 * emit the legacy { message: {...}, chat: {...} } shape.
 */
export function readUazapiEnvelopeEvent(payload: Record<string, unknown>) {
  return readString(payload.event)?.toLowerCase() ?? null;
}

export function readUazapiEventType(payload: Record<string, unknown>) {
  return readString(payload.EventType)?.toLowerCase() ?? null;
}

export function readUazapiEnvelopeData(
  payload: Record<string, unknown>,
): Record<string, unknown> | unknown[] {
  const data: unknown = payload.data;
  if (Array.isArray(data)) return data as unknown[];
  const record = readRecord(data);
  return Object.keys(record).length > 0 ? record : payload;
}

/**
 * Flatten Uazapi's legacy `{ message, chat }` payload into the same fields
 * used by the documented message envelope.
 */
export function normalizeUazapiInboundData(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const data = readUazapiEnvelopeData(payload);
  if (Array.isArray(data)) return {};
  const message = readRecord(data.message ?? payload.message);
  const chat = readRecord(data.chat ?? payload.chat);
  const normalized: Record<string, unknown> = { ...data, ...message };

  const setFallback = (key: string, ...values: unknown[]) => {
    const current = normalized[key];
    if (current !== undefined && current !== null && current !== "") return;
    const value = values.find(
      (candidate) =>
        candidate !== undefined && candidate !== null && candidate !== "",
    );
    if (value !== undefined) normalized[key] = value;
  };

  setFallback(
    "messageid",
    message.messageid,
    message.messageId,
    readRecord(message.key).id,
  );
  setFallback(
    "chatid",
    message.chatid,
    message.chatId,
    chat.wa_chatid,
    chat.chatid,
    chat.jid,
    chat.id,
    chat.phone,
    chat.number,
    chat.wa_id,
  );
  setFallback(
    "sender",
    message.sender,
    message.sender_pn,
    message.senderPn,
    message.participant,
    chat.sender,
  );
  setFallback("sender_pn", message.sender_pn, message.senderPn);
  setFallback("sender_lid", message.sender_lid, message.senderLid);
  setFallback("isGroup", message.isGroup, chat.isGroup, chat.wa_isGroup);
  setFallback(
    "chatName",
    message.chatName,
    chat.name,
    chat.wa_name,
    chat.pushName,
  );
  setFallback(
    "senderName",
    message.senderName,
    chat.name,
    chat.wa_name,
    chat.pushName,
  );
  setFallback(
    "profilePhoto",
    data.profilePicUrl,
    data.photo,
    data.senderPhoto,
    message.profilePhoto,
    message.profilePicUrl,
    message.photo,
    chat.image,
    chat.imagePreview,
    chat.photo,
    chat.profilePicUrl,
  );
  setFallback("fromMe", message.fromMe);
  setFallback(
    "messageType",
    data.messageType,
    data.mediaType,
    data.type,
    message.messageType,
    message.mediaType,
    message.type,
  );
  setFallback(
    "text",
    message.text,
    message.body,
    message.messageText,
    message.conversation,
    typeof message.content === "string" ? message.content : undefined,
  );
  setFallback("content", message.content);
  setFallback("messageTimestamp", message.messageTimestamp, message.timestamp);
  setFallback(
    "fileURL",
    data.fileURL,
    data.fileUrl,
    data.file_url,
    data.mediaURL,
    data.mediaUrl,
    data.url,
    data.file,
    message.fileURL,
    message.fileUrl,
    message.file_url,
    message.mediaURL,
    message.mediaUrl,
    message.url,
    message.file,
  );
  setFallback(
    "mimetype",
    data.mimetype,
    data.mimeType,
    data.mime_type,
    data.contentType,
    message.mimetype,
    message.mimeType,
    message.mime_type,
    message.contentType,
  );
  setFallback("caption", data.caption, message.caption);
  setFallback("quoted", message.quoted, message.quotedMessageId);
  setFallback("edited", message.edited);

  return normalized;
}

export function parseUazapiContent(
  value: unknown,
): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parseUazapiContent(parsed);
    } catch {
      return null;
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/** Uazapi messageTimestamp is milliseconds; the `timestamp` fallback may be seconds. */
export function readUazapiTimestamp(data: Record<string, unknown>) {
  const milliseconds = readTimestampNumber(data.messageTimestamp);
  if (milliseconds !== undefined) return new Date(milliseconds);
  const fallback = readTimestampNumber(data.timestamp);
  if (fallback !== undefined) {
    return new Date(fallback < 10_000_000_000 ? fallback * 1000 : fallback);
  }
  return new Date();
}

function readTimestampNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

export function stripUazapiJid(value?: string) {
  if (!value) return "";
  if (
    value.includes("@lid") ||
    value.includes("@g.us") ||
    value.includes("@newsletter")
  ) {
    return "";
  }
  return value.split("@")[0]?.replace(/\D/g, "") ?? "";
}

export function isUazapiLid(value?: string) {
  return Boolean(value && /@lid$/iu.test(value));
}
