type ParsedOlxChatWebhookBase = {
  buyerEmail: string | null;
  customerDisplayName: string | null;
  customerPhone: string;
  chatId: string;
  externalMessageId: string;
  listId: string;
  message: string;
  timestamp: Date;
};

export type ParsedOlxChatWebhook = ParsedOlxChatWebhookBase &
  (
    | {
        origin: "buyer";
        senderType: "account" | "buyer" | "system";
      }
    | { origin: "seller"; senderType: "account" | "system" }
  );

const allowedKeys = new Set([
  "chatId",
  "email",
  "listId",
  "message",
  "messageId",
  "messageTimestamp",
  "name",
  "origin",
  "phone",
  "senderType",
]);
const senderTypes = new Set(["account", "buyer", "system"]);

export function parseOlxChatWebhook(
  payload: unknown,
): ParsedOlxChatWebhook | null {
  const input = readRecord(payload);
  if (!input || Object.keys(input).some((key) => !allowedKeys.has(key))) {
    return null;
  }
  const chatId = requiredString(input.chatId, 191);
  const externalMessageId = requiredString(input.messageId, 191);
  const listId = requiredString(input.listId, 191);
  const message = requiredString(input.message, 4_000);
  const timestampValue = requiredString(input.messageTimestamp, 80);
  const senderType = optionalString(input.senderType, 20);
  const origin = optionalString(input.origin, 20);
  const timestamp = timestampValue ? new Date(timestampValue) : null;
  if (
    !chatId ||
    !externalMessageId ||
    !listId ||
    !message ||
    !timestamp ||
    Number.isNaN(timestamp.getTime()) ||
    !isSenderType(senderType) ||
    (origin !== "buyer" && origin !== "seller") ||
    !validOptionalStrings(input)
  ) {
    return null;
  }
  const parsedBase: ParsedOlxChatWebhookBase = {
    buyerEmail: optionalString(input.email, 320),
    customerDisplayName: optionalString(input.name, 160),
    customerPhone: normalizePhone(input.phone),
    chatId,
    externalMessageId,
    listId,
    message,
    timestamp,
  };
  if (origin === "seller") {
    if (senderType === "buyer") return null;
    return { ...parsedBase, origin, senderType };
  }
  return { ...parsedBase, origin, senderType };
}

function isSenderType(
  value: string | null,
): value is ParsedOlxChatWebhook["senderType"] {
  return value !== null && senderTypes.has(value);
}

function validOptionalStrings(input: Record<string, unknown>) {
  return [input.email, input.name, input.phone].every(
    (value) =>
      value === undefined || value === null || typeof value === "string",
  );
}

function normalizePhone(value: unknown) {
  const phone = optionalString(value, 32);
  const digits = phone?.replace(/\D/gu, "") ?? "";
  if (digits.length < 7 || digits.length > 15 || /^(\d)\1+$/u.test(digits)) {
    return "";
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `55${digits.slice(1)}`;
  }
  return digits.length === 11 ? `55${digits}` : digits;
}

function requiredString(value: unknown, maxLength: number) {
  return optionalString(value, maxLength);
}

function optionalString(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
