import { createHash } from "node:crypto";
import { isPublicHttpsWebhookUrl } from "./externalBotWebhookDestination.js";

export class ExternalBotIntegrationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalBotIntegrationValidationError";
  }
}

export function hashWebhookSecret(secret: string) {
  return `sha256:${createHash("sha256").update(secret).digest("hex")}`;
}

export function normalizeWebhookSecretUpdate(value: string | null | undefined) {
  if (value === undefined || value === null) return value;
  const normalized = value.trim();
  if (!isStrongWebhookSecret(normalized)) {
    throw new ExternalBotIntegrationValidationError(
      "Webhook secret must contain at least 32 characters.",
    );
  }
  return normalized;
}

export function normalizeWebhookUrlUpdate(
  value: string | null | undefined,
  current: string | null,
) {
  if (value === undefined) return current;
  if (value === null) return null;
  const normalized = value.trim();
  if (!isPublicHttpsWebhookUrl(normalized)) {
    throw new ExternalBotIntegrationValidationError(
      "Webhook URL must use public HTTPS without embedded credentials.",
    );
  }
  return normalized;
}

export function isStrongWebhookSecret(value: string) {
  return value.length >= 32 && Buffer.byteLength(value, "utf8") >= 32;
}
