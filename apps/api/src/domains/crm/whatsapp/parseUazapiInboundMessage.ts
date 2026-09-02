import { isTruthy, readRecord, readString } from "./zapiPayloadRead.js";
import type {
  ParsedZapiInboundMessage,
  ParsedZapiContactIdentity,
} from "./parseZapiInboundMessage.js";
import { readUsableZapiContactName } from "./parseZapiInboundMessage.js";
import { extractUazapiInboundContent } from "./uazapiInboundContent.js";
import {
  isUazapiLid,
  normalizeUazapiInboundData,
  readUazapiEnvelopeEvent,
  readUazapiTimestamp,
  stripUazapiJid,
} from "./uazapiPayloadData.js";

/** Uazapi inbound messages share the canonical parsed shape used by Z-API. */
export type ParsedUazapiInboundMessage = ParsedZapiInboundMessage;
export type ParsedUazapiContactIdentity = ParsedZapiContactIdentity;

export function parseUazapiInboundMessage(
  payload: Record<string, unknown>,
): ParsedUazapiInboundMessage | null {
  const event = readUazapiEnvelopeEvent(payload);
  if (event && event !== "message") return null;

  const data = normalizeUazapiInboundData(payload);
  if (Object.keys(data).length === 0) return null;
  if (isTruthy(data.isGroup)) return null;

  // Use the provider/WhatsApp message id only; the internal `id` (`r`+hex)
  // is never a stable external identifier.
  const externalId = readString(data.messageid) ?? readString(data.messageId);
  if (!externalId) return null;

  const identity = parseUazapiContactIdentity(payload);
  if (!identity) return null;

  const content = extractUazapiInboundContent(data);
  if (!content) return null;

  const profilePhotoUrl = identity.fromMe
    ? undefined
    : readString(data.profilePhoto);
  return {
    ...(identity.customerDisplayName
      ? { customerDisplayName: identity.customerDisplayName }
      : {}),
    ...(identity.chatLid ? { chatLid: identity.chatLid } : {}),
    content: content.content,
    externalId,
    fromMe: identity.fromMe,
    ...(content.mediaType ? { mediaType: content.mediaType } : {}),
    ...(content.mediaUrl ? { mediaUrl: content.mediaUrl } : {}),
    metadata: buildMetadata(payload, data, identity.chatLid, content.metadata),
    phone: identity.phone,
    ...(profilePhotoUrl ? { profilePhotoUrl } : {}),
    providerTimestamp: readUazapiTimestamp(data),
    type: content.type,
  };
}

export function parseUazapiContactIdentity(
  payload: Record<string, unknown>,
): ParsedUazapiContactIdentity | null {
  const data = normalizeUazapiInboundData(payload);
  if (Object.keys(data).length === 0) return null;

  const chatid = readString(data.chatid);
  const sender = readString(data.sender);
  const senderPn = readString(data.sender_pn);
  const senderLid = readString(data.sender_lid);
  const fromMe = isTruthy(data.fromMe);

  const chatLid = isUazapiLid(chatid)
    ? stripUazapiLidDigits(chatid)
    : senderLid
      ? stripUazapiLidDigits(senderLid)
      : undefined;
  // For outbound app messages the connected account is the sender, so the
  // recipient chatid carries the customer identity.
  const phone =
    stripUazapiJid(chatid) ||
    stripUazapiJid(senderPn) ||
    stripUazapiJid(sender) ||
    chatLid;
  if (!phone) return null;

  const customerDisplayName = readUsableUazapiContactName(
    fromMe
      ? readString(data.chatName)
      : (readString(data.senderName) ?? readString(data.chatName)),
  );
  return {
    ...(customerDisplayName ? { customerDisplayName } : {}),
    ...(chatLid ? { chatLid } : {}),
    fromMe,
    phone,
  };
}

function readUsableUazapiContactName(value?: string) {
  if (!value || /^\+?[\d\s().-]+$/u.test(value)) return undefined;
  return readUsableZapiContactName(value);
}

function stripUazapiLidDigits(value?: string) {
  const digits = value?.replace(/@[a-z.]+$/iu, "").replace(/\D/gu, "");
  return digits || undefined;
}

function buildMetadata(
  payload: Record<string, unknown>,
  data: Record<string, unknown>,
  chatLid: string | undefined,
  contentMetadata: Record<string, unknown>,
) {
  const content = readRecord(parseUazapiContentValue(data.content));
  return {
    ...contentMetadata,
    chatLid: chatLid ?? null,
    instance: readString(payload.instance) ?? null,
    isEdit: isTruthy(data.edited) ? true : null,
    payloadKeys: Object.keys(payload).sort(),
    provider: "uazapi",
    quotedMessageId: readQuotedMessageId(data, content),
    senderLid: readString(data.sender_lid) ?? null,
  };
}

function parseUazapiContentValue(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  return value;
}

function readQuotedMessageId(
  data: Record<string, unknown>,
  content: Record<string, unknown>,
) {
  const direct = readString(data.quoted) ?? readString(data.quotedMessageId);
  if (direct) return direct;
  for (const value of Object.values(content)) {
    const stanzaId = readString(
      readRecord(readRecord(value).contextInfo).stanzaId,
    );
    if (stanzaId) return stanzaId;
  }
  return null;
}
