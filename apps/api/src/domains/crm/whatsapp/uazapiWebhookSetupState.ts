import type { CrmMessagingWebhookConfigResult } from "../ports/crmMessagingGateway.js";

/**
 * Uazapi registers a single webhook URL per instance carrying every event, so
 * setup state tracks one logical registration instead of the per-type list
 * ZAPI requires. The state lives under `metadata.uazapiWebhookSetup` and is
 * read by channelConnectionReadiness via the `state` field.
 */
export const requiredUazapiWebhookTypes = ["uazapi"] as const;

export type UazapiWebhookSetupStatus =
  "configured" | "configuring" | "failed" | "pending";

export type UazapiWebhookSetupState = {
  attemptCount: number;
  configuredAt: string | null;
  lastErrorCode: string | null;
  requestedAt: string;
  requiredTypes: readonly string[];
  state: UazapiWebhookSetupStatus;
  succeededTypes: readonly string[];
  supportCode: string;
  updatedAt: string;
  version: 1;
};

export function createUazapiWebhookSetupIntent(
  connectionId: string,
  now = new Date(),
): UazapiWebhookSetupState {
  const timestamp = now.toISOString();
  return {
    attemptCount: 0,
    configuredAt: null,
    lastErrorCode: null,
    requestedAt: timestamp,
    requiredTypes: requiredUazapiWebhookTypes,
    state: "pending",
    succeededTypes: [],
    supportCode: uazapiSetupSupportCode(connectionId),
    updatedAt: timestamp,
    version: 1,
  };
}

export function markUazapiWebhookSetupAttempt(
  current: UazapiWebhookSetupState,
  now = new Date(),
): UazapiWebhookSetupState {
  return {
    ...current,
    attemptCount: current.attemptCount + 1,
    lastErrorCode: null,
    state: "configuring",
    updatedAt: now.toISOString(),
  };
}

export function completeUazapiWebhookSetupAttempt(
  current: UazapiWebhookSetupState,
  results: readonly CrmMessagingWebhookConfigResult[],
  now = new Date(),
): UazapiWebhookSetupState {
  const succeededTypes = requiredUazapiWebhookTypes.filter((type) =>
    results.some(
      (result) => result.type === type && result.ok && result.verified === true,
    ),
  );
  const configured =
    succeededTypes.length === requiredUazapiWebhookTypes.length;
  const timestamp = now.toISOString();
  return {
    ...current,
    configuredAt: configured ? timestamp : null,
    lastErrorCode: configured ? null : classifyWebhookFailure(results),
    state: configured ? "configured" : "failed",
    succeededTypes,
    updatedAt: timestamp,
  };
}

export function failUazapiWebhookSetupAttempt(
  current: UazapiWebhookSetupState,
  error: unknown,
  now = new Date(),
): UazapiWebhookSetupState {
  return {
    ...current,
    configuredAt: null,
    lastErrorCode: classifySetupError(error),
    state: "failed",
    succeededTypes: [],
    updatedAt: now.toISOString(),
  };
}

export function readUazapiWebhookSetupState(
  metadata: Record<string, unknown>,
): UazapiWebhookSetupState | null {
  const value = readRecord(metadata.uazapiWebhookSetup);
  const state = value.state;
  if (!isSetupState(state)) return null;
  const timestamp = new Date().toISOString();
  return {
    attemptCount:
      typeof value.attemptCount === "number" && value.attemptCount >= 0
        ? Math.floor(value.attemptCount)
        : 0,
    configuredAt: readString(value.configuredAt),
    lastErrorCode: readString(value.lastErrorCode),
    requestedAt: readString(value.requestedAt) ?? timestamp,
    requiredTypes:
      readStringArray(value.requiredTypes).length > 0
        ? readStringArray(value.requiredTypes)
        : requiredUazapiWebhookTypes,
    state,
    succeededTypes: readStringArray(value.succeededTypes),
    supportCode: readString(value.supportCode) ?? "UAZAPI-SETUP",
    updatedAt: readString(value.updatedAt) ?? timestamp,
    version: 1,
  };
}

export function withUazapiWebhookSetupState(
  metadata: Record<string, unknown>,
  state: UazapiWebhookSetupState,
) {
  return { ...metadata, uazapiWebhookSetup: state };
}

function classifyWebhookFailure(
  results: readonly CrmMessagingWebhookConfigResult[],
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

function uazapiSetupSupportCode(connectionId: string) {
  const normalized = connectionId.replace(/[^a-z0-9]/giu, "").slice(0, 10);
  return `UAZAPI-${normalized.toUpperCase() || "SETUP"}`;
}

function isSetupState(value: unknown): value is UazapiWebhookSetupStatus {
  return ["configured", "configuring", "failed", "pending"].includes(
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
