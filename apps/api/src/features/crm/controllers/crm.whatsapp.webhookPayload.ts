import type { Context } from "hono";
import { CrmMessagingValidationError } from "./crm.messaging.errors.js";

const maxWebhookBytes = 256 * 1024;
const maxWebhookDepth = 16;
const maxWebhookKeys = 1_000;
const maxWebhookArrayItems = 500;
const maxWebhookStringLength = 64 * 1024;
const sensitiveWebhookKey =
  /(?:authorization|client.?token|password|secret|token)$/iu;

export async function parseWebhookPayload(context: Context) {
  const declaredLength = Number(context.req.header("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxWebhookBytes) {
    throw new CrmMessagingValidationError("Webhook body is too large.");
  }
  const raw = await context.req.text();
  if (new TextEncoder().encode(raw).byteLength > maxWebhookBytes) {
    throw new CrmMessagingValidationError("Webhook body is too large.");
  }
  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    throw new CrmMessagingValidationError("Webhook body must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new CrmMessagingValidationError("Webhook body must be an object.");
  }
  return validateAndSanitizeWebhookValue(body, 0, { keys: 0 }) as Record<
    string,
    unknown
  >;
}

function validateAndSanitizeWebhookValue(
  value: unknown,
  depth: number,
  budget: { keys: number },
): unknown {
  if (depth > maxWebhookDepth) {
    invalidWebhook("Webhook body is too deeply nested.");
  }
  if (typeof value === "string") {
    if (value.length > maxWebhookStringLength) {
      invalidWebhook("Webhook body contains an oversized string.");
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > maxWebhookArrayItems) {
      invalidWebhook("Webhook body contains too many array items.");
    }
    return value.map((item) =>
      validateAndSanitizeWebhookValue(item, depth + 1, budget),
    );
  }
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value as Record<string, unknown>);
  budget.keys += entries.length;
  if (budget.keys > maxWebhookKeys) {
    invalidWebhook("Webhook body contains too many object keys.");
  }
  return Object.fromEntries(
    entries.map(([key, child]) => [
      key,
      sensitiveWebhookKey.test(key)
        ? "[redacted]"
        : validateAndSanitizeWebhookValue(child, depth + 1, budget),
    ]),
  );
}

function invalidWebhook(message: string): never {
  throw new CrmMessagingValidationError(message);
}
