import { describe, expect, it, vi } from "vitest";
import { crmRetentionRequiredRelations } from "../infrastructure/db/crm/drizzleCrmRetentionRepository.js";
import { IntegrationError } from "../shared/errors/errorDescriptor.js";
import {
  assertCrmRetentionSchemaReady,
  waitForCrmRetentionDatabases,
} from "./crmRetentionStartup.js";

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

  it("waits for migrations before allowing retention claims", async () => {
    const schemaProbe = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(
        new IntegrationError("schema not ready", {
          boundary: "database",
          code: "CRM_RETENTION_SCHEMA_UNAVAILABLE",
          httpStatus: 503,
          kind: "persistence",
          phase: "startup",
          retryable: true,
          safeDetails: { missingRelations: ["product.crm_retention_scopes"] },
        }),
      )
      .mockResolvedValue(undefined);
    const sleep = vi.fn<(milliseconds: number) => Promise<void>>();
    sleep.mockResolvedValue(undefined);

    await waitForCrmRetentionDatabases({
      attempts: 3,
      auditClient: { unsafe: vi.fn().mockResolvedValue([]) },
      initialDelayMs: 10,
      productClient: { unsafe: vi.fn().mockResolvedValue([]) },
      schemaProbe,
      sleep,
    });

    expect(schemaProbe).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it("reports missing product and audit relations without exposing data", async () => {
    const productRows = crmRetentionRequiredRelations.map((name) => ({
      name,
      relation: name === "crm_retention_scopes" ? null : name,
    }));
    const auditRows = [{ name: "audit_events", relation: null }];

    await expect(
      assertCrmRetentionSchemaReady({
        auditClient: { unsafe: vi.fn().mockResolvedValue(auditRows) },
        productClient: { unsafe: vi.fn().mockResolvedValue(productRows) },
      }),
    ).rejects.toMatchObject({
      descriptor: {
        code: "CRM_RETENTION_SCHEMA_UNAVAILABLE",
        safeDetails: {
          missingRelations: [
            "product.crm_retention_scopes",
            "audit.audit_events",
          ],
        },
      },
    });
  });
});
