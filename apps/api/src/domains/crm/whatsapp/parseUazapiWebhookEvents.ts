import type { CrmConnectionConfiguredStatus } from "../ports/crmConnectionRepository.js";
import type { CrmMessageStatus } from "../ports/crmConversationRepository.js";
import { readRecord, readString } from "./zapiPayloadRead.js";
import {
  readUazapiEnvelopeData,
  readUazapiEnvelopeEvent,
  readUazapiEventType,
  stripUazapiJid,
} from "./uazapiPayloadData.js";

export type ParsedUazapiConnectionEvent = {
  connected: boolean | null;
  connectedPhone: string | null;
  status: CrmConnectionConfiguredStatus | null;
};

export type ParsedUazapiStatusUpdate = {
  externalId: string;
  providerStatus: string | null;
  status: CrmMessageStatus | null;
};

export function isUazapiConnectionEvent(payload: Record<string, unknown>) {
  const event = readUazapiEnvelopeEvent(payload);
  const eventType = readUazapiEventType(payload);
  return event === "connection" || eventType === "connection";
}

export function isUazapiStatusEvent(payload: Record<string, unknown>) {
  const event = readUazapiEnvelopeEvent(payload);
  const eventType = readUazapiEventType(payload);
  return (
    event === "status" ||
    eventType === "messages_update" ||
    eventType === "messages.update"
  );
}

export function parseUazapiConnection(
  payload: Record<string, unknown>,
): ParsedUazapiConnectionEvent {
  const data = readUazapiEnvelopeData(payload);
  const record = Array.isArray(data) ? {} : data;
  const rawStatus = readString(record.status)?.toLowerCase();
  const connected =
    record.connected === true || rawStatus === "connected"
      ? true
      : record.connected === false || rawStatus === "disconnected"
        ? false
        : null;
  const jid = readRecord(record.jid);
  const phone =
    stripUazapiJid(readString(jid.user)) ||
    stripUazapiJid(readString(record.owner)) ||
    stripUazapiJid(readString(record.phone)) ||
    null;
  return {
    connected,
    connectedPhone: phone,
    status: connected === null ? null : connected ? "active" : "disconnected",
  };
}

export function parseUazapiStatusUpdates(
  payload: Record<string, unknown>,
): ParsedUazapiStatusUpdate[] {
  const data = readUazapiEnvelopeData(payload);
  const entries = Array.isArray(data) ? data : [data];
  return entries.flatMap((entry) => {
    const record = readRecord(entry);
    const externalId =
      readString(record.messageid) ?? readString(record.messageId);
    if (!externalId) return [];
    const providerStatus = readString(record.status)?.toUpperCase() ?? null;
    return [
      {
        externalId,
        providerStatus,
        status: providerStatus ? mapUazapiMessageStatus(providerStatus) : null,
      },
    ];
  });
}

function mapUazapiMessageStatus(status: string): CrmMessageStatus | null {
  const statusMap: Record<string, CrmMessageStatus> = {
    CANCELED: "FAILED",
    CANCELLED: "FAILED",
    DELIVERED: "DELIVERED",
    FAILED: "FAILED",
    PENDING: "SENT",
    PLAYED: "READ",
    QUEUED: "SENT",
    READ: "READ",
    SENT: "SENT",
  };
  return statusMap[status] ?? null;
}
