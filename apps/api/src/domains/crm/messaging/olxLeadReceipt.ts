import { createHash } from "node:crypto";
import type { ParsedOlxLeadWebhook } from "./parseOlxLeadWebhook.js";

export const olxLeadReceiptEventType = "crm.lead.olx.received";

export type OlxLeadReceiptPayload = {
  adId: string | null;
  adsInfo: Record<string, string | number>;
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string | null;
  createdAt: string;
  identityKey: string;
  linkAd: string;
  listId: string;
  message: string;
  schemaVersion: 1;
  source: ParsedOlxLeadWebhook["source"];
};

export function createOlxLeadReceiptPayload(
  connectionId: string,
  parsed: ParsedOlxLeadWebhook,
): OlxLeadReceiptPayload {
  return {
    adId: parsed.adId,
    adsInfo: parsed.adsInfo,
    buyerEmail: parsed.buyerEmail,
    buyerName: parsed.buyerName,
    buyerPhone: parsed.buyerPhone,
    createdAt: parsed.createdAt.toISOString(),
    identityKey: leadIdentityKey(connectionId, parsed),
    linkAd: parsed.linkAd,
    listId: parsed.listId,
    message: parsed.message,
    schemaVersion: 1,
    source: parsed.source,
  };
}

export function readOlxLeadReceiptPayload(
  payload: Record<string, unknown>,
): OlxLeadReceiptPayload | null {
  if (payload.schemaVersion !== 1) return null;
  const createdAt = readString(payload.createdAt);
  const source = readString(payload.source);
  const adsInfo = readAdsInfo(payload.adsInfo);
  if (
    !createdAt ||
    Number.isNaN(new Date(createdAt).getTime()) ||
    !source ||
    !["whatsapp", "telefone", "chat", "financing", "olx"].includes(source) ||
    !adsInfo
  ) {
    return null;
  }
  const required = [
    "buyerEmail",
    "buyerName",
    "identityKey",
    "linkAd",
    "listId",
    "message",
  ] as const;
  if (required.some((key) => !readString(payload[key]))) return null;
  if (
    !isNullableString(payload.adId) ||
    !isNullableString(payload.buyerPhone)
  ) {
    return null;
  }
  return payload as OlxLeadReceiptPayload;
}

export function buildOlxLeadProviderReference(identityKey: string) {
  return `olx-lead:${createHash("sha256").update(identityKey).digest("hex")}`;
}

function leadIdentityKey(connectionId: string, parsed: ParsedOlxLeadWebhook) {
  const identity = parsed.externalId
    ? ["official-external-id", parsed.externalId]
    : [
        "connection-scoped-fallback",
        connectionId,
        parsed.source,
        parsed.listId,
        parsed.buyerEmail.toLowerCase(),
        parsed.createdAt.toISOString(),
        parsed.message,
      ];
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

function readAdsInfo(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.values(value).every(
    (item) => typeof item === "string" || typeof item === "number",
  )
    ? (value as Record<string, string | number>)
    : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isNullableString(value: unknown) {
  return value === null || readString(value) !== null;
}
