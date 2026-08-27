import type { BillingWebhookRateLimiter } from "../../domains/billing/ports/billingWebhookRateLimiter.js";
import { BillingWebhookRateLimiterUnavailableError } from "../../domains/billing/ports/billingWebhookRateLimiter.js";

const windowMs = 60_000;
const requestLimit = 600;
const redisKeyPrefix = "billing:asaas:webhook:rate";
const atomicFixedWindowScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
return count
`;

type RedisRateLimitClient = {
  sendCommand(args: string[]): Promise<unknown>;
};

export function createMemoryAsaasWebhookRateLimiter(): BillingWebhookRateLimiter {
  const buckets = new Map<string, { count: number; startedAt: number }>();
  return {
    async consume(input) {
      const now = Date.now();
      const fingerprint = assertSourceFingerprint(input.sourceFingerprint);
      const current = buckets.get(fingerprint);
      if (!current || now - current.startedAt >= windowMs) {
        if (buckets.size >= 10_000) removeExpiredBuckets(buckets, now);
        buckets.set(fingerprint, { count: 1, startedAt: now });
        return { allowed: true };
      }
      current.count += 1;
      if (current.count <= requestLimit) return { allowed: true };
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((windowMs - (now - current.startedAt)) / 1000),
        ),
      };
    },
  };
}

export function createDefaultAsaasWebhookRateLimiter(
  env: Record<string, string | undefined> = process.env,
): BillingWebhookRateLimiter {
  if (
    env.APP_ENV === "local" ||
    env.APP_ENV === "test" ||
    env.NODE_ENV === "test"
  ) {
    return createMemoryAsaasWebhookRateLimiter();
  }
  return {
    async consume() {
      throw new BillingWebhookRateLimiterUnavailableError();
    },
  };
}

export function createRedisAsaasWebhookRateLimiter(
  client: RedisRateLimitClient,
  ensureReady: () => Promise<void>,
): BillingWebhookRateLimiter {
  return {
    async consume(input) {
      try {
        const fingerprint = assertSourceFingerprint(input.sourceFingerprint);
        await ensureReady();
        const value = await client.sendCommand([
          "EVAL",
          atomicFixedWindowScript,
          "1",
          `${redisKeyPrefix}:${fingerprint}`,
          String(windowMs),
        ]);
        const count = parseCount(value);
        return count <= requestLimit
          ? { allowed: true }
          : { allowed: false, retryAfterSeconds: windowMs / 1000 };
      } catch (error) {
        if (error instanceof BillingWebhookRateLimiterUnavailableError) {
          throw error;
        }
        throw new BillingWebhookRateLimiterUnavailableError();
      }
    },
  };
}

function parseCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new BillingWebhookRateLimiterUnavailableError();
  }
  return count;
}

function assertSourceFingerprint(value: string) {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new BillingWebhookRateLimiterUnavailableError();
  }
  return value;
}

function removeExpiredBuckets(
  buckets: Map<string, { count: number; startedAt: number }>,
  now: number,
) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.startedAt >= windowMs) buckets.delete(key);
  }
  if (buckets.size >= 10_000) {
    buckets.delete(buckets.keys().next().value as string);
  }
}
