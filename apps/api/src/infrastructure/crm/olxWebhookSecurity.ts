import { createHash } from "node:crypto";
import { isIP } from "node:net";
import {
  CrmOlxWebhookSecurityUnavailableError,
  type CrmOlxWebhookSecurity,
} from "../../domains/crm/ports/crmOlxWebhookSecurity.js";

const minuteMs = 60_000;
const redisKeyPrefix = "crm:olx:webhook:rate";
const connectionLimit = 120;
const unauthenticatedLimit = 60;
const futureSkewMs = 60_000;
const maxAgeMs = 600_000;
const defaultOlxWebhookAllowedAddresses = ["54.162.151.93"] as const;
const atomicFixedWindowScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
return count
`;

type RedisRateLimitClient = {
  sendCommand(args: string[]): Promise<unknown>;
};

export class CrmOlxWebhookSecurityConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmOlxWebhookSecurityConfigurationError";
  }
}

export function createOlxWebhookSecurity(): CrmOlxWebhookSecurity {
  const buckets = new Map<string, { count: number; windowStartedAt: number }>();
  return {
    async consume(input) {
      const timestamp = input.now.getTime();
      const key = bucketKey(input);
      const current = buckets.get(key);
      if (!current || timestamp - current.windowStartedAt >= minuteMs) {
        if (buckets.size >= 10_000) removeExpiredBuckets(buckets, timestamp);
        buckets.set(key, {
          count: 1,
          windowStartedAt: timestamp,
        });
        return true;
      }
      current.count += 1;
      return (
        current.count <=
        (input.scope === "unauthenticated"
          ? unauthenticatedLimit
          : connectionLimit)
      );
    },
    futureSkewMs,
    maxAgeMs,
    now: () => new Date(),
  };
}

export function createRedisOlxWebhookSecurity(
  client: RedisRateLimitClient,
  ensureReady: () => Promise<void>,
): CrmOlxWebhookSecurity {
  const settings = createOlxWebhookSecurity();
  return {
    ...settings,
    async consume(input) {
      try {
        await ensureReady();
        const result = await client.sendCommand([
          "EVAL",
          atomicFixedWindowScript,
          "1",
          redisKey(input),
          String(minuteMs),
        ]);
        const count = parseRedisCount(result);
        return (
          count <=
          (input.scope === "unauthenticated"
            ? unauthenticatedLimit
            : connectionLimit)
        );
      } catch (error) {
        if (error instanceof CrmOlxWebhookSecurityUnavailableError) throw error;
        throw new CrmOlxWebhookSecurityUnavailableError();
      }
    },
  };
}

export function createOlxWebhookSourceFingerprint(input: {
  clientAddress: string | null;
  connectionId: string;
}) {
  const clientAddress = normalizeClientAddress(input.clientAddress);
  return createHash("sha256")
    .update(`olx_chat\0${input.connectionId}\0${clientAddress}`)
    .digest("hex");
}

export function isOlxWebhookSourceAllowed(
  clientAddress: string | null,
  env: Record<string, string | undefined> = process.env,
) {
  if (!isDeployedEnvironment(env)) return true;
  if (env.CRM_OLX_TRUST_PROXY_HEADERS !== "true") return false;
  const address = normalizeClientAddress(clientAddress);
  if (address === "unresolved") return false;
  return readOlxWebhookAllowedAddresses(env).has(address);
}

function bucketKey(input: Parameters<CrmOlxWebhookSecurity["consume"]>[0]) {
  if (input.scope === "unauthenticated") {
    if (!/^[a-f0-9]{64}$/u.test(input.sourceFingerprint)) {
      throw new CrmOlxWebhookSecurityUnavailableError(
        "OLX webhook source fingerprint is invalid.",
      );
    }
    return `unauthenticated:${input.sourceFingerprint}`;
  }
  return [
    "connection",
    input.provider,
    input.tenantId,
    input.storeId,
    input.connectionId,
  ].join(":");
}

function redisKey(input: Parameters<CrmOlxWebhookSecurity["consume"]>[0]) {
  return `${redisKeyPrefix}:${bucketKey(input)}`;
}

function parseRedisCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new CrmOlxWebhookSecurityUnavailableError(
      "Redis returned an invalid OLX webhook rate-limit result.",
    );
  }
  return count;
}

function normalizeClientAddress(value: string | null) {
  const candidate = value?.trim() ?? "";
  return isIP(candidate) ? candidate.toLowerCase() : "unresolved";
}

function isDeployedEnvironment(env: Record<string, string | undefined>) {
  const environment = (env.APP_ENV ?? env.NODE_ENV ?? "").toLowerCase();
  return environment === "staging" || environment === "production";
}

function readOlxWebhookAllowedAddresses(
  env: Record<string, string | undefined>,
) {
  const configured = env.CRM_OLX_WEBHOOK_ALLOWED_IPS?.trim();
  const candidates = configured
    ? configured.split(",").map((value) => value.trim().toLowerCase())
    : [...defaultOlxWebhookAllowedAddresses];
  if (candidates.length === 0 || candidates.some((value) => !isIP(value))) {
    throw new CrmOlxWebhookSecurityConfigurationError(
      "CRM_OLX_WEBHOOK_ALLOWED_IPS must contain only comma-separated IP addresses.",
    );
  }
  return new Set(candidates);
}

function removeExpiredBuckets(
  buckets: Map<string, { count: number; windowStartedAt: number }>,
  timestamp: number,
) {
  for (const [key, bucket] of buckets) {
    if (timestamp - bucket.windowStartedAt >= minuteMs) buckets.delete(key);
  }
  if (buckets.size >= 10_000)
    buckets.delete(buckets.keys().next().value as string);
}
