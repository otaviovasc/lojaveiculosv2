import { createHash } from "node:crypto";
import type { ParsedOlxLeadWebhook } from "./parseOlxLeadWebhook.js";
import type { CrmConnectionCredentialVault } from "../ports/crmConnectionSetupProvider.js";

export const olxLeadReceiptEventType = "crm.lead.olx.received";
const olxLeadReceiptPurpose = (connectionId: string) =>
  `olx.lead-recovery:${connectionId}`;

export type SealedOlxLeadReceiptPayload = {
  identityKey: string;
  schemaVersion: 2;
  sealedReceipt: string;
};

export type ClearedOlxLeadReceiptPayload = {
  identityKey: string;
  receiptClearedAt: string;
  schemaVersion: 3;
};

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

export async function sealOlxLeadReceiptPayload(
  vault: CrmConnectionCredentialVault,
  scope: { connectionId: string; storeId: string; tenantId: string },
  receipt: OlxLeadReceiptPayload,
): Promise<SealedOlxLeadReceiptPayload> {
  return {
    identityKey: receipt.identityKey,
    schemaVersion: 2,
    sealedReceipt: await vault.seal({
      plaintext: JSON.stringify(receipt),
      purpose: olxLeadReceiptPurpose(scope.connectionId),
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    }),
  };
}

export async function openOlxLeadReceiptPayload(
  vault: CrmConnectionCredentialVault,
  scope: { connectionId: string; storeId: string; tenantId: string },
  payload: Record<string, unknown>,
) {
  if (
    payload.schemaVersion !== 2 ||
    typeof payload.identityKey !== "string" ||
    typeof payload.sealedReceipt !== "string"
  ) {
    return null;
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(
      await vault.open({
        purpose: olxLeadReceiptPurpose(scope.connectionId),
        sealed: payload.sealedReceipt,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      }),
    );
  } catch {
    return null;
  }
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
    return null;
  }
  const receipt = readOlxLeadReceiptPayload(decoded as Record<string, unknown>);
  return receipt?.identityKey === payload.identityKey ? receipt : null;
}

export function buildOlxLeadProviderReference(identityKey: string) {
  return `olx-lead:${createHash("sha256").update(identityKey).digest("hex")}`;
}

export function clearOlxLeadReceiptPayload(
  payload: Record<string, unknown>,
  clearedAt: Date,
): ClearedOlxLeadReceiptPayload {
  return {
    identityKey:
      typeof payload.identityKey === "string" ? payload.identityKey : "unknown",
    receiptClearedAt: clearedAt.toISOString(),
    schemaVersion: 3,
  };
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
