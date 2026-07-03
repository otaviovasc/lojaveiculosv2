import { createHash } from "node:crypto";

export type ZapiWebhookType =
  | "chat_presence"
  | "connected"
  | "delivery"
  | "disconnected"
  | "received"
  | "status";

export function buildZapiProviderEventId(input: {
  connectionId: string;
  payload: Record<string, unknown>;
  type: ZapiWebhookType;
}) {
  const identity = [
    input.connectionId,
    input.type,
    ...readIdentityParts(input.payload),
  ].join("|");
  const hash = createHash("sha256").update(identity).digest("hex");
  return `crm-whatsapp-zapi-${hash}`;
}

function readIdentityParts(payload: Record<string, unknown>) {
  const ids = readStringList(payload.ids);
  const messageId =
    readString(payload.messageId) ??
    readString(payload.messageID) ??
    readString(payload.id);
  if (messageId) ids.push(messageId);
  if (ids.length > 0) {
    return [
      `ids:${[...new Set(ids)].sort().join(",")}`,
      `status:${readString(payload.status) ?? ""}`,
    ];
  }

  const phone =
    readString(payload.phone) ??
    readString(payload.chatPhone) ??
    readString(payload.connectedPhone);
  const timestamp =
    readString(payload.timestamp) ??
    readString(payload.momment) ??
    readString(payload.moment);
  return [
    `phone:${phone ?? ""}`,
    `status:${readString(payload.status) ?? ""}`,
    `timestamp:${timestamp ?? ""}`,
    `payload:${stableStringify(payload)}`,
  ];
}

function readString(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => readString(item))
    .filter((item): item is string => Boolean(item));
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
