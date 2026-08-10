import type { CrmWhatsappWebhookConfigResult } from "../ports/crmWhatsappGateway.js";

export const requiredZapiWebhookTypes = [
  "chat-presence",
  "connected",
  "delivery",
  "disconnected",
  "received",
  "status",
] as const;

export type ZapiWebhookSetupStatus =
  "configured" | "configuring" | "failed" | "partial";

export type ZapiWebhookSetupState = {
  attemptCount: number;
  configuredAt: string | null;
  lastErrorCode: string | null;
  leaseExpiresAt: string | null;
  leaseOwner: string | null;
  requestedAt: string;
  requiredTypes: readonly string[];
  status: ZapiWebhookSetupStatus;
  succeededTypes: readonly string[];
  supportCode: string;
  updatedAt: string;
  version: 1;
};

export function createZapiWebhookSetupIntent(
  connectionId: string,
  now = new Date(),
): ZapiWebhookSetupState {
  const timestamp = now.toISOString();
  return {
    attemptCount: 0,
    configuredAt: null,
    lastErrorCode: null,
    leaseExpiresAt: null,
    leaseOwner: null,
    requestedAt: timestamp,
    requiredTypes: requiredZapiWebhookTypes,
    status: "configuring",
    succeededTypes: [],
    supportCode: zapiSetupSupportCode(connectionId),
    updatedAt: timestamp,
    version: 1,
  };
}

export function markZapiWebhookSetupAttempt(
  current: ZapiWebhookSetupState,
  lease: { expiresAt: Date; owner: string },
  now = new Date(),
): ZapiWebhookSetupState {
  return {
    ...current,
    attemptCount: current.attemptCount + 1,
    lastErrorCode: null,
    leaseExpiresAt: lease.expiresAt.toISOString(),
    leaseOwner: lease.owner,
    status: "configuring",
    updatedAt: now.toISOString(),
  };
}

export function completeZapiWebhookSetupAttempt(
  current: ZapiWebhookSetupState,
  results: readonly CrmWhatsappWebhookConfigResult[],
  now = new Date(),
): ZapiWebhookSetupState {
  const succeededTypes = requiredZapiWebhookTypes.filter((type) =>
    results.some((result) => result.type === type && result.ok),
  );
  const allConfigured =
    succeededTypes.length === requiredZapiWebhookTypes.length;
  const status: ZapiWebhookSetupStatus = allConfigured
    ? "configured"
    : succeededTypes.length
      ? "partial"
      : "failed";
  const timestamp = now.toISOString();
  return {
    ...current,
    configuredAt: allConfigured ? timestamp : null,
    lastErrorCode: allConfigured ? null : classifyWebhookFailure(results),
    leaseExpiresAt: null,
    leaseOwner: null,
    status,
    succeededTypes,
    updatedAt: timestamp,
  };
}

export function failZapiWebhookSetupAttempt(
  current: ZapiWebhookSetupState,
  error: unknown,
  now = new Date(),
): ZapiWebhookSetupState {
  return {
    ...current,
    configuredAt: null,
    lastErrorCode: classifySetupError(error),
    leaseExpiresAt: null,
    leaseOwner: null,
    status: "failed",
    succeededTypes: [],
    updatedAt: now.toISOString(),
  };
}

export function readZapiWebhookSetupState(
  metadata: Record<string, unknown>,
): ZapiWebhookSetupState | null {
  const value = readRecord(metadata.webhookSetup);
  const status = value.status;
  const supportCode = readString(value.supportCode);
  const requestedAt = readString(value.requestedAt);
  const updatedAt = readString(value.updatedAt);
  if (
    value.version !== 1 ||
    !isSetupStatus(status) ||
    !supportCode ||
    !requestedAt ||
    !updatedAt
  ) {
    return null;
  }
  return {
    attemptCount:
      typeof value.attemptCount === "number" && value.attemptCount >= 0
        ? Math.floor(value.attemptCount)
        : 0,
    configuredAt: readString(value.configuredAt),
    lastErrorCode: readString(value.lastErrorCode),
    leaseExpiresAt: readString(value.leaseExpiresAt),
    leaseOwner: readString(value.leaseOwner),
    requestedAt,
    requiredTypes: readStringArray(value.requiredTypes),
    status,
    succeededTypes: readStringArray(value.succeededTypes),
    supportCode,
    updatedAt,
    version: 1,
  };
}

export function withZapiWebhookSetupState(
  metadata: Record<string, unknown>,
  state: ZapiWebhookSetupState,
) {
  return { ...metadata, webhookSetup: state };
}

function classifyWebhookFailure(
  results: readonly CrmWhatsappWebhookConfigResult[],
) {
  const failed = results.filter((result) => !result.ok);
  if (failed.some((result) => result.status === 429)) return "rate_limited";
  if (failed.some((result) => result.status === null)) return "request_failed";
  if (failed.some((result) => (result.status ?? 0) >= 500)) {
    return "provider_unavailable";
  }
  return "provider_rejected";
}

function classifySetupError(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = readString((error as { code?: unknown }).code);
    if (code) return code;
  }
  if (error instanceof Error && error.name === "AbortError") return "timeout";
  return "request_failed";
}

function zapiSetupSupportCode(connectionId: string) {
  const normalized = connectionId.replace(/[^a-z0-9]/giu, "").slice(0, 10);
  return `ZAPI-${normalized.toUpperCase() || "SETUP"}`;
}

function isSetupStatus(value: unknown): value is ZapiWebhookSetupStatus {
  return ["configured", "configuring", "failed", "partial"].includes(
    String(value),
  );
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
