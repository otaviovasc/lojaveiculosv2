import { botError } from "./externalBotErrors.js";
import type { ExternalBotEventPayload } from "./externalBotModels.js";

const allowedEventFields = new Set<keyof ExternalBotEventPayload>([
  "channel",
  "classification",
  "connectionState",
  "contactRef",
  "direction",
  "humanAttendanceActive",
  "humanAttendanceState",
  "humanAttendanceStateVersion",
  "messageRef",
  "summary",
  "threadState",
  "vehicleRef",
]);

const forbiddenKey = /cpf|credit|credito|dob|birth|nascimento|income|renda/i;
const forbiddenValue =
  /(?:\b\d{3}[.-]?\d{3}[.-]?\d{3}[-.]?\d{2}\b)|(?:\b(?:cpf|renda|nascimento|cr[eé]dito)\s*[:=])/i;

export function assertExternalBotPayloadSafe(
  payload: Record<string, unknown>,
): asserts payload is ExternalBotEventPayload {
  for (const key of Object.keys(payload)) {
    if (forbiddenKey.test(key) || !allowedEventFields.has(key as never)) {
      throw botError(
        "CRM_BOT_PII_NOT_ALLOWED",
        `Event payload field is not allowed: ${key}`,
        422,
      );
    }
    assertSafeValue(payload[key]);
  }
}

export function assertCommandHasNoForbiddenPii(value: unknown): void {
  if (typeof value === "string") {
    assertSafeValue(value);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenKey.test(key)) {
      throw botError(
        "CRM_BOT_PII_NOT_ALLOWED",
        `Command field is not allowed: ${key}`,
        422,
      );
    }
    assertCommandHasNoForbiddenPii(nested);
  }
}

function assertSafeValue(value: unknown): void {
  if (typeof value === "string" && forbiddenValue.test(value)) {
    throw botError(
      "CRM_BOT_PII_NOT_ALLOWED",
      "Sensitive personal data is not allowed.",
      422,
    );
  }
  if (Array.isArray(value)) value.forEach(assertSafeValue);
  else if (value && typeof value === "object")
    Object.values(value).forEach(assertSafeValue);
}
