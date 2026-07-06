import {
  auditFailurePolicies,
  createAuditRecorder,
} from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { createLoggingAuditSink, createMemoryAuditSink } from "./auditSink.js";
import {
  createNoopServiceLogger,
  createServiceContext,
  createServiceLogMetadata,
} from "./serviceContext.js";

describe("service context scaffolding", () => {
  it("creates a public context with noop dependencies by default", async () => {
    const context = createServiceContext({
      request: { requestId: "req_1" },
    });

    await expect(
      context.audit.record({
        action: "health.read",
        actor: context.actor,
        entityId: "health",
        entityType: "system",
        requestId: context.requestId,
        storeId: context.storeId,
        tenantId: context.tenantId,
      }),
    ).resolves.toBeUndefined();
    expect(context.actor).toEqual({ id: "public", kind: "public" });
    expect(context.permissions).toEqual([]);
    expect(context.requestId).toBe("req_1");
  });

  it("captures audit events in a memory sink for tests", async () => {
    const audit = createMemoryAuditSink();
    const context = createServiceContext({
      audit,
      request: { correlationId: "corr_1", requestId: "req_1" },
    });

    await context.audit.record({
      action: "vehicle.read",
      actor: context.actor,
      entityId: "vehicle_1",
      entityType: "vehicle",
      requestId: context.requestId,
      storeId: context.storeId,
      tenantId: context.tenantId,
    });

    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toEqual(
      expect.objectContaining({
        action: "vehicle.read",
        requestId: "req_1",
      }),
    );
  });

  it("logs audit records through the logging sink", async () => {
    const logger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    const sink = createLoggingAuditSink({ logger, sinkName: "test" });

    await sink.record({
      action: "vehicle.create",
      actor: { id: "user_1", kind: "user" },
      entityId: "vehicle_1",
      entityType: "vehicle",
      requestId: "req_1",
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(logger.info).toHaveBeenCalledWith(
      "audit.recorded",
      expect.objectContaining({
        action: "vehicle.create",
        sinkName: "test",
      }),
    );
  });

  it("wraps audit sink failures according to the selected tier", async () => {
    const logger = {
      error: vi.fn(),
      warn: vi.fn(),
    };
    const recorder = createAuditRecorder({
      logger,
      sink: {
        record: vi.fn(async () => {
          throw new Error("database unavailable");
        }),
      },
    });

    const result = await recorder.record({
      action: "vehicle.create",
      actor: { id: "user_1", kind: "user" },
      entityId: "vehicle_1",
      entityType: "vehicle",
      requestId: "req_1",
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(result.ok).toBe(false);
    expect(result.policy).toEqual(auditFailurePolicies.bestEffort);
    expect(logger.warn).toHaveBeenCalledWith(
      "audit.record.failed",
      expect.objectContaining({ tier: "best_effort" }),
    );

    await expect(
      recorder.record(
        {
          action: "billing.charge",
          actor: { id: "system", kind: "system" },
          criticality: "critical",
          entityId: "invoice_1",
          entityType: "invoice",
          requestId: "req_2",
          storeId: "store_1",
          tenantId: "tenant_1",
        },
        "required",
      ),
    ).rejects.toThrow("database unavailable");
  });

  it("enforces critical audit failures through service contexts", async () => {
    const logger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    const context = createServiceContext({
      audit: {
        record: vi.fn(async () => {
          throw new Error("audit database unavailable");
        }),
      },
      logger,
      request: { requestId: "req_critical" },
    });

    await expect(
      context.audit.record({
        action: "billing.entitlement.update",
        actor: context.actor,
        criticality: "critical",
        entityId: "store_1",
        entityType: "store",
        requestId: context.requestId,
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    ).rejects.toThrow("audit database unavailable");
    expect(logger.error).toHaveBeenCalledWith(
      "audit.record.failed",
      expect.objectContaining({ tier: "required" }),
    );
  });

  it("adds stable request metadata for service logs", () => {
    const context = createServiceContext({
      logger: createNoopServiceLogger(),
      request: { correlationId: "corr_1", requestId: "req_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(
      createServiceLogMetadata(context, { action: "vehicle.read" }),
    ).toEqual({
      action: "vehicle.read",
      actorExternalId: null,
      actorId: "public",
      actorKind: "public",
      billingManagedBy: null,
      correlationId: "corr_1",
      membershipRole: null,
      requestId: "req_1",
      storeId: "store_1",
      tenantId: "tenant_1",
    });
  });
});
