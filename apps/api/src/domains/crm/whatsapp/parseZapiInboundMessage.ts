import type { CrmWhatsappMessageType } from "../ports/crmWhatsappRepository.js";
import {
  isTruthy,
  readNumber,
  readRecord,
  readString,
} from "./zapiPayloadRead.js";
import { extractZapiInboundContent } from "./zapiInboundContent.js";

export type ParsedZapiInboundMessage = {
  buyerName?: string;
  chatLid?: string;
  content: string;
  externalId: string;
  fromMe: boolean;
  mediaType?: string;
  mediaUrl?: string;
  metadata: Record<string, unknown>;
  phone: string;
  providerTimestamp: Date;
  type: CrmWhatsappMessageType;
};

export type ParsedZapiContactIdentity = Pick<
  ParsedZapiInboundMessage,
  "buyerName" | "chatLid" | "fromMe" | "phone"
>;

export function parseZapiInboundMessage(
  payload: Record<string, unknown>,
): ParsedZapiInboundMessage | null {
  if (isTruthy(payload.isGroup) || isTruthy(payload.broadcast)) return null;
  if (isTruthy(payload.waitingMessage) || isTruthy(payload.isNewsletter)) {
    return null;
  }
  if (isNotification(payload)) return null;
  if (isTruthy(payload.isStatusReply) && !hasContent(payload)) return null;

  const externalId = readString(payload.messageId);
  if (!externalId) return null;

  const identity = parseZapiContactIdentity(payload);
  if (!identity) return null;

  const content = extractZapiInboundContent(payload);
  if (!content) return null;
  return {
    ...(identity.buyerName ? { buyerName: identity.buyerName } : {}),
    ...(identity.chatLid ? { chatLid: identity.chatLid } : {}),
    content: content.content,
    externalId,
    fromMe: identity.fromMe,
    ...(content.mediaType ? { mediaType: content.mediaType } : {}),
    ...(content.mediaUrl ? { mediaUrl: content.mediaUrl } : {}),
    metadata: buildMetadata(payload, identity.chatLid, content.metadata),
    phone: identity.phone,
    providerTimestamp: readZapiTimestamp(payload),
    type: content.type,
  };
}

export function parseZapiContactIdentity(
  payload: Record<string, unknown>,
): ParsedZapiContactIdentity | null {
  const chatLid = readString(payload.chatLid) ?? readString(payload.senderLid);
  const phone = resolvePhone(payload, chatLid);
  if (!phone) return null;
  const fromMe = isTruthy(payload.fromMe);
  const buyerName = fromMe
    ? readString(payload.chatName)
    : readString(payload.senderName);
  return {
    ...(buyerName ? { buyerName } : {}),
    ...(chatLid ? { chatLid } : {}),
    fromMe,
    phone,
  };
}

function resolvePhone(
  payload: Record<string, unknown>,
  chatLid?: string,
): string | null {
  const rawPhone = readString(payload.phone);
  let resolved = normalizePhone(rawPhone);
  const ctwaPhone = readCtwaPhone(payload);
  const participantPhone = normalizePhone(readString(payload.participantPhone));
  const connectedPhone = normalizePhone(readString(payload.connectedPhone));

  if (isLid(rawPhone) || isLikelyLidNumber(resolved, chatLid)) {
    const chatPhone = normalizePhone(readString(payload.chatPhone));
    if (chatPhone && !isLid(readString(payload.chatPhone))) {
      resolved = chatPhone;
    } else {
      const chatNamePhone = normalizeChatNamePhone(
        readString(payload.chatName),
      );
      resolved =
        participantPhone ??
        chatNamePhone ??
        ctwaPhone ??
        connectedPhone ??
        chatLid ??
        null;
    }
  }

  return resolved || participantPhone || ctwaPhone || connectedPhone || null;
}

function normalizePhone(value?: string) {
  return value?.replace(/@[a-z.]+$/i, "").replace(/[^\d+]/g, "") || null;
}

function isLid(value?: string) {
  return Boolean(value && /@lid/i.test(value));
}

function isLikelyLidNumber(value?: string | null, chatLid?: string) {
  if (!value) return false;
  const strippedLid = chatLid?.replace(/@[a-z.]+$/i, "").replace(/[^\d]/g, "");
  if (strippedLid && value === strippedLid) return true;
  if (value.length > 15 || value.length < 7) return true;
  return /^(\d)\1+$/.test(value);
}

function normalizeChatNamePhone(value?: string) {
  const digits = value?.replace(/[^\d]/g, "");
  return digits && /^\d{7,15}$/.test(digits) ? digits : null;
}

function readCtwaPhone(payload: Record<string, unknown>) {
  const context = readRecord(payload.ctwaContext);
  const referral = readRecord(context.referral);
  const sourceId =
    readString(referral.sourceId) ?? readString(context.sourceId);
  return sourceId?.startsWith("+") ? normalizePhone(sourceId) : null;
}

function hasContent(payload: Record<string, unknown>) {
  return Boolean(extractZapiInboundContent(payload));
}

function buildMetadata(
  payload: Record<string, unknown>,
  chatLid: string | undefined,
  contentMetadata: Record<string, unknown>,
) {
  return {
    ...contentMetadata,
    chatLid: chatLid ?? null,
    isEdit: payload.isEdit ?? null,
    payloadKeys: Object.keys(payload).sort(),
    participantLid: payload.participantLid ?? null,
    provider: "zapi",
    senderLid: payload.senderLid ?? null,
  };
}

function readZapiTimestamp(payload: Record<string, unknown>) {
  const momment = readProviderDate(payload.momment);
  if (momment) return momment;
  const timestamp = readNumber(payload.timestamp);
  return timestamp === undefined
    ? new Date()
    : (readDate(timestamp * 1000) ?? new Date());
}

function readProviderDate(value: unknown) {
  const milliseconds = readNumber(value);
  if (milliseconds !== undefined) return readDate(milliseconds);
  const text = readString(value);
  return text ? readDate(Date.parse(text)) : null;
}

function readDate(milliseconds: number) {
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isNotification(payload: Record<string, unknown>) {
  return (
    payload.notification === true ||
    typeof payload.notification === "string" ||
    payload.type === "notification"
  );
}
