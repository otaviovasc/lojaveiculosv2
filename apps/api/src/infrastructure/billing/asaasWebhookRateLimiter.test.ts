import { describe, expect, it, vi } from "vitest";
import { BillingWebhookRateLimiterUnavailableError } from "../../domains/billing/ports/billingWebhookRateLimiter.js";
import {
  createDefaultAsaasWebhookRateLimiter,
  createRedisAsaasWebhookRateLimiter,
} from "./asaasWebhookRateLimiter.js";

describe("Redis Asaas webhook rate limiter", () => {
  it("shares an atomic provider source bucket without exposing source data", async () => {
    const calls: string[][] = [];
    const sendCommand = vi.fn(async (args: string[]) => {
      calls.push(args);
      return 601;
    });
    const limiter = createRedisAsaasWebhookRateLimiter(
      { sendCommand },
      vi.fn(async () => undefined),
    );

    await expect(
      limiter.consume({ provider: "asaas", sourceFingerprint: "a".repeat(64) }),
    ).resolves.toEqual({ allowed: false, retryAfterSeconds: 60 });
    const command = calls[0] ?? [];
    expect(command).toContain(`billing:asaas:webhook:rate:${"a".repeat(64)}`);
    expect(command.join(" ")).not.toContain("secret");
  });

  it("fails closed when Redis is unavailable", async () => {
    const limiter = createRedisAsaasWebhookRateLimiter(
      { sendCommand: vi.fn() },
      vi.fn(async () => {
        throw new Error("redis unavailable");
      }),
    );

    await expect(
      limiter.consume({ provider: "asaas", sourceFingerprint: "b".repeat(64) }),
    ).rejects.toBeInstanceOf(BillingWebhookRateLimiterUnavailableError);
  });

  it("does not silently use process-local limits in a deployed runtime", async () => {
    const limiter = createDefaultAsaasWebhookRateLimiter({
      APP_ENV: "staging",
    });

    await expect(
      limiter.consume({ provider: "asaas", sourceFingerprint: "c".repeat(64) }),
    ).rejects.toBeInstanceOf(BillingWebhookRateLimiterUnavailableError);
  });

  it("rejects raw source data instead of putting it in a Redis key", async () => {
    const sendCommand = vi.fn(async () => 1);
    const limiter = createRedisAsaasWebhookRateLimiter(
      { sendCommand },
      vi.fn(async () => undefined),
    );

    await expect(
      limiter.consume({ provider: "asaas", sourceFingerprint: "raw-token" }),
    ).rejects.toBeInstanceOf(BillingWebhookRateLimiterUnavailableError);
    expect(sendCommand).not.toHaveBeenCalled();
  });
});
