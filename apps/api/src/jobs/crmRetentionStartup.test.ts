import { describe, expect, it, vi } from "vitest";
import { waitForCrmRetentionDatabases } from "./crmRetentionStartup.js";

describe("waitForCrmRetentionDatabases", () => {
  it("retries a transient startup failure before retention claims begin", async () => {
    const productProbe = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(new Error("not ready"))
      .mockResolvedValue([]);
    const auditProbe = vi.fn<() => Promise<unknown>>().mockResolvedValue([]);
    const sleep = vi.fn<(milliseconds: number) => Promise<void>>();
    sleep.mockResolvedValue(undefined);

    await waitForCrmRetentionDatabases({
      attempts: 3,
      auditClient: { unsafe: auditProbe },
      initialDelayMs: 10,
      productClient: { unsafe: productProbe },
      sleep,
    });

    expect(productProbe).toHaveBeenCalledTimes(2);
    expect(auditProbe).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it("fails with safe, actionable metadata after bounded attempts", async () => {
    const unavailable = {
      unsafe: vi.fn<() => Promise<unknown>>().mockRejectedValue(new Error()),
    };

    const result = waitForCrmRetentionDatabases({
      attempts: 2,
      auditClient: unavailable,
      initialDelayMs: 1,
      productClient: unavailable,
      sleep: async () => undefined,
    });

    await expect(result).rejects.toMatchObject({
      descriptor: {
        boundary: "database",
        code: "CRM_RETENTION_DATABASE_UNAVAILABLE",
        httpStatus: 503,
        kind: "network",
        phase: "startup",
        retryable: true,
        safeDetails: { attempts: 2 },
      },
      name: "IntegrationError",
    });
  });
});
