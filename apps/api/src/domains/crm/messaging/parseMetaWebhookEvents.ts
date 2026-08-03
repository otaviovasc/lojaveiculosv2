export type MetaMessagingProvider = "composio_whatsapp" | "composio_instagram";
export type MetaMessageStatus = "SENT" | "DELIVERED" | "READ" | "FAILED";
export type MetaMediaReference = {
  fileName: string | null;
  id: string | null;
  mimeType: string | null;
  type: string;
  url: string | null;
};
type ParsedMetaEventBase = {
  contactExternalId: string;
  externalConnectionId: string;
  externalMessageId: string;
  provider: MetaMessagingProvider;
  providerEventKey: string;
  timestamp: Date | null;
};
type MetaMessageEvent = ParsedMetaEventBase & {
  kind: "message";
  media: MetaMediaReference | null;
  text: string | null;
};
type MetaStatusEvent = ParsedMetaEventBase & {
  kind: "status";
  status: MetaMessageStatus;
};
export type ParsedMetaWebhookEvent = MetaMessageEvent | MetaStatusEvent;
export function parseMetaWebhookEvents(
  payload: unknown,
): ParsedMetaWebhookEvent[] {
  const root = readRecord(payload);
  if (!root) return [];
  const parsed =
    root.object === "whatsapp_business_account"
      ? parseWhatsappEntries(root.entry)
      : root.object === "instagram"
        ? parseInstagramEntries(root.entry)
        : [];
  const unique = new Map(
    parsed.map((event) => [event.providerEventKey, event]),
  );
  return [...unique.values()];
}
function parseWhatsappEntries(value: unknown) {
  const events: ParsedMetaWebhookEvent[] = [];
  for (const entry of readRecords(value)) {
    for (const change of readRecords(entry.changes)) {
      const body = readRecord(change.value);
      const metadata = readRecord(body?.metadata);
      const connectionId = readString(metadata?.phone_number_id);
      if (change.field !== "messages" || !body || !connectionId) continue;
      for (const message of readRecords(body.messages)) {
        const parsed = parseWhatsappMessage(message, connectionId);
        if (parsed) events.push(parsed);
      }
      for (const status of readRecords(body.statuses)) {
        const parsed = parseWhatsappStatus(status, connectionId);
        if (parsed) events.push(parsed);
      }
    }
  }
  return events;
}
function parseWhatsappMessage(
  message: Record<string, unknown>,
  connectionId: string,
): MetaMessageEvent | null {
  const messageId = readString(message.id);
  const contactId = readString(message.from);
  if (!messageId || !contactId) return null;
  return {
    ...eventBase(
      "composio_whatsapp",
      "message",
      connectionId,
      messageId,
      contactId,
      readTimestamp(message.timestamp, 1_000),
    ),
    kind: "message",
    media: readWhatsappMedia(message),
    text: readWhatsappText(message),
  };
}
function parseWhatsappStatus(
  value: Record<string, unknown>,
  connectionId: string,
): MetaStatusEvent | null {
  const messageId = readString(value.id);
  const contactId = readString(value.recipient_id);
  const status = mapStatus(value.status);
  if (!messageId || !contactId || !status) return null;
  return {
    ...eventBase(
      "composio_whatsapp",
      `status:${status}`,
      connectionId,
      messageId,
      contactId,
      readTimestamp(value.timestamp, 1_000),
    ),
    kind: "status",
    status,
  };
}
function parseInstagramEntries(value: unknown) {
  const events: ParsedMetaWebhookEvent[] = [];
  for (const entry of readRecords(value)) {
    const accountId = readString(entry.id);
    for (const item of readRecords(entry.messaging)) {
      const parsed = parseInstagramEvent(item, accountId);
      if (parsed) events.push(parsed);
    }
  }
  return events;
}
function parseInstagramEvent(
  event: Record<string, unknown>,
  entryAccountId: string | null,
): ParsedMetaWebhookEvent | null {
  const senderId = readString(readRecord(event.sender)?.id);
  const recipientId = readString(readRecord(event.recipient)?.id);
  const connectionId = entryAccountId ?? recipientId;
  if (!senderId || !recipientId || !connectionId) return null;
  const contactId = senderId === connectionId ? recipientId : senderId;
  const message = readRecord(event.message);
  const timestamp = readTimestamp(event.timestamp, 1);

  if (message) {
    if (message.is_echo === true) return null;
    const messageId = readString(message.mid);
    if (!messageId) return null;
    return {
      ...eventBase(
        "composio_instagram",
        "message",
        connectionId,
        messageId,
        contactId,
        timestamp,
      ),
      kind: "message",
      media: readInstagramMedia(message),
      text: readString(message.text),
    };
  }
  return null;
}
function readWhatsappText(message: Record<string, unknown>) {
  const type = readString(message.type);
  const content = type ? readRecord(message[type]) : null;
  if (type === "text") return readString(content?.body);
  return readString(content?.caption);
}
function readWhatsappMedia(
  message: Record<string, unknown>,
): MetaMediaReference | null {
  const type = readString(message.type);
  if (
    !type ||
    !["audio", "document", "image", "sticker", "video"].includes(type)
  ) {
    return null;
  }
  const media = readRecord(message[type]);
  const id = readString(media?.id);
  return media && id
    ? {
        fileName: readString(media.filename),
        id,
        mimeType: readString(media.mime_type),
        type,
        url: null,
      }
    : null;
}
function readInstagramMedia(
  message: Record<string, unknown>,
): MetaMediaReference | null {
  const attachment = readRecords(message.attachments)[0];
  const payload = readRecord(attachment?.payload);
  const url = readString(payload?.url);
  const id = readString(payload?.id);
  if (!attachment || (!url && !id)) return null;
  return {
    fileName: null,
    id,
    mimeType: null,
    type: readString(attachment.type) ?? "unknown",
    url,
  };
}
function mapStatus(value: unknown): MetaMessageStatus | null {
  const status = readString(value)?.toUpperCase();
  return status === "SENT" ||
    status === "DELIVERED" ||
    status === "READ" ||
    status === "FAILED"
    ? status
    : null;
}
function eventBase(
  provider: MetaMessagingProvider,
  kind: string,
  connectionId: string,
  messageId: string,
  contactId: string,
  timestamp: Date | null,
): ParsedMetaEventBase {
  return {
    contactExternalId: contactId,
    externalConnectionId: connectionId,
    externalMessageId: messageId,
    provider,
    providerEventKey: `meta:${provider}:${kind}:${connectionId}:${messageId}`,
    timestamp,
  };
}
function readTimestamp(value: unknown, multiplier: number): Date | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  const parsed = new Date(numeric * multiplier);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function readRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
function readRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = readRecord(item);
    return record ? [record] : [];
  });
}
function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
