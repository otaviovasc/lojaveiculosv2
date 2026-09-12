import { createHash } from "node:crypto";
import { readRecord, readString } from "./zapiPayloadRead.js";
import {
  normalizeUazapiInboundData,
  readUazapiEnvelopeData,
} from "./uazapiPayloadData.js";

export type UazapiWebhookType = "connection" | "received" | "status";

export function buildUazapiProviderEventId(input: {
  connectionId: string;
  payload: Record<string, unknown>;
  type: UazapiWebhookType;
}) {
  const identity = [
    input.connectionId,
    input.type,
    ...readIdentityParts(input.payload),
  ].join("|");
  const hash = createHash("sha256").update(identity).digest("hex");
  return `crm-whatsapp-uazapi-${hash}`;
}

function readIdentityParts(payload: Record<string, unknown>) {
  const data = readUazapiEnvelopeData(payload);
  const entries = Array.isArray(data) ? data : [data];
  const ids = entries.flatMap((entry) => {
    const record = readRecord(entry);
    const id = readString(record.messageid) ?? readString(record.messageId);
    return id ? [id] : [];
  });
  if (ids.length > 0) {
    const statuses = entries
      .map((entry) => readString(readRecord(entry).status) ?? "")
      .sort()
      .join(",");
    return [`ids:${[...new Set(ids)].sort().join(",")}`, `status:${statuses}`];
  }

  const normalized = normalizeUazapiInboundData(payload);
  const record = Array.isArray(data) ? {} : data;
  const phone =
    readString(normalized.chatid) ??
    readString(readRecord(record.jid).user) ??
    readString(record.owner) ??
    readString(record.phone);
  return [
    `phone:${phone ?? ""}`,
    `status:${readString(record.status) ?? ""}`,
    `connected:${String(record.connected ?? "")}`,
    `payload:${stableStringify(payload)}`,
  ];
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}
