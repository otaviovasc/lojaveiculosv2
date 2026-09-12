import type { CrmConnectionConfiguredStatus } from "../ports/crmConnectionRepository.js";
import type { CrmMessageStatus } from "../ports/crmConversationRepository.js";
import { readNumber, readRecord, readString } from "./zapiPayloadRead.js";

export type ParsedZapiDelivery = {
  errorMessage: string | null;
  externalId: string | null;
  providerTimestamp: Date;
};

export type ParsedZapiStatus = {
  externalIds: string[];
  providerStatus: string | null;
  status: CrmMessageStatus | "READ_BY_ME" | null;
};

export type ParsedZapiConnectionEvent = {
  connectedPhone: string | null;
  status: CrmConnectionConfiguredStatus | null;
};

export function parseZapiDelivery(payload: Record<string, unknown>) {
  const errorMessage = readWebhookError(payload.error);
  return {
    errorMessage,
    externalId: readExternalId(payload),
    providerTimestamp: readWebhookTimestamp(payload),
  } satisfies ParsedZapiDelivery;
}

export function parseZapiStatus(payload: Record<string, unknown>) {
  const providerStatus = readString(payload.status)?.toUpperCase() ?? null;
  return {
    externalIds: readExternalIds(payload),
    providerStatus,
    status: providerStatus ? mapZapiMessageStatus(providerStatus) : null,
  } satisfies ParsedZapiStatus;
}

export function parseZapiConnected(payload: Record<string, unknown>) {
  const rawStatus = readString(payload.status)?.toUpperCase();
  const status =
    payload.connected === true ||
    payload.smartphoneConnected === true ||
    rawStatus === "CONNECTED"
      ? "active"
      : payload.connected === false ||
          payload.smartphoneConnected === false ||
          rawStatus === "DISCONNECTED"
        ? "disconnected"
        : null;
  return {
    connectedPhone:
      readString(payload.connectedPhone) ?? readString(payload.phone) ?? null,
    status,
  } satisfies ParsedZapiConnectionEvent;
}

export function parseZapiDisconnected(payload: Record<string, unknown>) {
  return {
    connectedPhone:
      readString(payload.connectedPhone) ?? readString(payload.phone) ?? null,
    status: "disconnected",
  } satisfies ParsedZapiConnectionEvent;
}

export function readWebhookTimestamp(payload: Record<string, unknown>) {
  const value =
    readNumber(payload.timestamp) ??
    readNumber(payload.momment) ??
    readNumber(payload.moment);
  if (!value) return new Date();
  return new Date(value < 10_000_000_000 ? value * 1000 : value);
}

function readExternalId(payload: Record<string, unknown>) {
  return (
    readString(payload.messageId) ??
    readString(payload.id) ??
    readString(payload.messageID) ??
    null
  );
}

function readExternalIds(payload: Record<string, unknown>) {
  const ids = payload.ids;
  if (Array.isArray(ids)) {
    return ids.flatMap((id) => {
      const value = readString(id);
      return value ? [value] : [];
    });
  }
  const externalId = readExternalId(payload);
  return externalId ? [externalId] : [];
}

function mapZapiMessageStatus(
  status: string,
): CrmMessageStatus | "READ_BY_ME" | null {
  const statusMap: Record<string, CrmMessageStatus | "READ_BY_ME"> = {
    DELIVERED: "DELIVERED",
    ERROR: "FAILED",
    FAILED: "FAILED",
    PENDING: "SENT",
    PLAYED: "READ",
    READ: "READ",
    READ_BY_ME: "READ_BY_ME",
    RECEIVED: "DELIVERED",
    SENT: "SENT",
  };
  return statusMap[status] ?? null;
}

function readWebhookError(value: unknown) {
  if (!value) return null;
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  return JSON.stringify(readRecord(value));
}
