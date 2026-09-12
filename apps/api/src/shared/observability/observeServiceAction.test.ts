import { createMemoryAuditSink } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { IntegrationError } from "../errors/errorDescriptor.js";
import { createServiceContext } from "../serviceContext.js";
import { observeServiceAction } from "./observeServiceAction.js";

describe("observeServiceAction", () => {
  it("records correlated success without duplicating action metadata", async () => {
    const audit = createMemoryAuditSink();
    const logger = createLogger();
    const context = createServiceContext({
      audit,
      logger,
      request: {
        causationId: "cause_1",
        correlationId: "corr_1",
        idempotencyKey: "idem_1",
        requestId: "req_1",
      },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    await expect(
      observeServiceAction(context, specification, async () => "result"),
    ).resolves.toBe("result");

    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({
      action: specification.action,
      outcome: "succeeded",
      request: {
        causationId: "cause_1",
        correlationId: "corr_1",
        idempotencyKey: "idem_1",
      },
      severity: "info",
    });
    expect(logger.info).toHaveBeenCalledTimes(2);
  });

  it("records structured provider failure and rethrows the original error", async () => {
    const audit = createMemoryAuditSink();
    const logger = createLogger();
    const context = createServiceContext({
      audit,
      logger,
      request: { requestId: "req_2" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    const error = new IntegrationError("Missing API_PLACA_KEY.", {
      attemptState: "not_attempted",
      boundary: "provider_configuration",
      code: "INTEGRATION_NOT_CONFIGURED",
      httpStatus: 503,
      kind: "configuration",
      operation: "plate_lookup",
      phase: "configuration",
      provider: "apibrasil",
      retryable: false,
      safeDetails: { missingConfiguration: ["API_PLACA_KEY"] },
    });

    await expect(
      observeServiceAction(context, specification, async () => {
        throw error;
      }),
    ).rejects.toBe(error);

    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({
      action: specification.action,
      metadata: {
        errorBoundary: "provider_configuration",
        errorCode: "INTEGRATION_NOT_CONFIGURED",
        providerAttemptState: "not_attempted",
        providerOperation: "plate_lookup",
      },
      outcome: "failed",
      provider: { name: "apibrasil" },
      severity: "error",
    });
    expect(logger.error).toHaveBeenCalledWith(
      specification.action,
      expect.objectContaining({
        errorCode: "INTEGRATION_NOT_CONFIGURED",
        lifecycle: "failed",
      }),
    );
  });
});

const specification = {
  action: "inventory.enrichment.plate_lookup",
  entityId: "store_1",
  entityType: "inventory_enrichment",
  summary: {
    failed: "Inventory enrichment request failed",
    succeeded: "Inventory enrichment request completed",
  },
} as const;

function createLogger() {
  return {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  };
}
