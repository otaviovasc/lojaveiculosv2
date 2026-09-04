export type CrmPushDeliveryMode = "live" | "off" | "shadow";

export type CrmPushPublicConfig = {
  appId: string | null;
  deliveryMode: CrmPushDeliveryMode;
};

export type CrmPushRuntimeConfig = CrmPushPublicConfig & {
  apiKey: string | null;
  batchSize: number;
  cleanupBatchSize: number;
  leaseDurationMs: number;
  maxAttempts: number;
  requestTimeoutMs: number;
  terminalRetentionDays: number;
};

export function readCrmPushPublicConfig(
  env: Record<string, string | undefined> = process.env,
): CrmPushPublicConfig {
  const deliveryMode = readDeliveryMode(env.CRM_PUSH_DELIVERY_MODE);
  return {
    appId: deliveryMode === "off" ? null : readOptional(env.ONESIGNAL_APP_ID),
    deliveryMode,
  };
}

export function readCrmPushRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): CrmPushRuntimeConfig {
  const publicConfig = readCrmPushPublicConfig(env);
  const config = {
    ...publicConfig,
    apiKey:
      publicConfig.deliveryMode === "live"
        ? readOptional(env.ONESIGNAL_API_KEY)
        : null,
    batchSize: boundedPositiveInt(env.CRM_PUSH_BATCH_SIZE, 25, 100),
    cleanupBatchSize: boundedPositiveInt(
      env.CRM_PUSH_CLEANUP_BATCH_SIZE,
      100,
      500,
    ),
    leaseDurationMs: boundedPositiveInt(
      env.CRM_PUSH_LEASE_DURATION_MS,
      60_000,
      15 * 60_000,
    ),
    maxAttempts: boundedPositiveInt(env.CRM_PUSH_MAX_ATTEMPTS, 8, 25),
    requestTimeoutMs: boundedPositiveInt(
      env.CRM_PUSH_REQUEST_TIMEOUT_MS,
      10_000,
      60_000,
    ),
    terminalRetentionDays: boundedPositiveInt(
      env.CRM_PUSH_TERMINAL_RETENTION_DAYS,
      30,
      365,
    ),
  } satisfies CrmPushRuntimeConfig;
  if (config.leaseDurationMs < config.requestTimeoutMs + 15_000) {
    throw new CrmPushConfigurationError(
      "CRM_PUSH_LEASE_DURATION_MS must be at least 15000ms longer than CRM_PUSH_REQUEST_TIMEOUT_MS.",
    );
  }
  if (config.deliveryMode === "shadow" && !config.appId) {
    throw new CrmPushConfigurationError(
      "ONESIGNAL_APP_ID is required when CRM_PUSH_DELIVERY_MODE=shadow.",
    );
  }
  if (config.deliveryMode === "live" && (!config.appId || !config.apiKey)) {
    throw new CrmPushConfigurationError(
      "ONESIGNAL_APP_ID and ONESIGNAL_API_KEY are required when CRM_PUSH_DELIVERY_MODE=live.",
    );
  }
  return config;
}

export class CrmPushConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmPushConfigurationError";
  }
}

function readDeliveryMode(value: string | undefined): CrmPushDeliveryMode {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "off") return "off";
  if (normalized === "shadow" || normalized === "live") return normalized;
  throw new CrmPushConfigurationError(
    "CRM_PUSH_DELIVERY_MODE must be one of off, shadow, or live.",
  );
}

function readOptional(value: string | undefined): string | null {
  return value?.trim() || null;
}

function boundedPositiveInt(
  value: string | undefined,
  fallback: number,
  maximum: number,
): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > maximum) {
    return fallback;
  }
  return parsed;
}
