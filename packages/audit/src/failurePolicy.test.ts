import { describe, expect, it, vi } from "vitest";
import type { AuditEvent } from "./contracts.js";
import {
  auditFailurePolicies,
  createAuditRecorder,
  isRequiredAuditPolicy,
  recordAuditEvent,
  resolveAuditFailurePolicyForEvent,
} from "./failurePolicy.js";
import { createMemoryAuditSink } from "./sinks.js";

const event = {
  action: "vehicle.updated",
  actor: { id: "user-1", kind: "user" },
  entityId: "vehicle-1",
  entityType: "vehicle",
  requestId: "request-1",
  storeId: "store-1",
  tenantId: "tenant-1",
} satisfies AuditEvent;

describe("audit failure policy", () => {
  it("derives fail-closed behavior from event criticality", () => {
    expect(resolveAuditFailurePolicyForEvent({ criticality: "critical" })).toBe(
      auditFailurePolicies.required,
    );
    expect(resolveAuditFailurePolicyForEvent({ criticality: "high" })).toBe(
      auditFailurePolicies.important,
    );
    expect(resolveAuditFailurePolicyForEvent({ criticality: "medium" })).toBe(
      auditFailurePolicies.bestEffort,
    );
  });

  it("gives an explicit event failure tier precedence over criticality", () => {
    expect(
      resolveAuditFailurePolicyForEvent({
        criticality: "critical",
        failureTier: "important",
      }),
    ).toBe(auditFailurePolicies.important);
    expect(isRequiredAuditPolicy("required")).toBe(true);
    expect(isRequiredAuditPolicy("important")).toBe(false);
  });

  it("records successful events and returns the resolved policy", async () => {
    const sink = createMemoryAuditSink();

    await expect(
      recordAuditEvent({ event: { ...event, criticality: "high" }, sink }),
    ).resolves.toMatchObject({
      event: { action: event.action },
      ok: true,
      policy: auditFailurePolicies.important,
    });
    expect(sink.events).toEqual([{ ...event, criticality: "high" }]);
  });

  it("logs and returns non-required audit failures without hiding context", async () => {
    const error = new Error("audit database unavailable");
    const logger = { error: vi.fn(), warn: vi.fn() };
    const sink = { record: vi.fn().mockRejectedValue(error) };

    await expect(
      recordAuditEvent({
        event: { ...event, failureTier: "important" },
        logger,
        sink,
      }),
    ).resolves.toMatchObject({ error, ok: false });
    expect(logger.error).toHaveBeenCalledWith("audit.record.failed", {
      action: event.action,
      correlationId: null,
      entityId: event.entityId,
      entityType: event.entityType,
      errorMessage: error.message,
      requestId: event.requestId,
      tier: "important",
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("logs and rethrows required audit failures", async () => {
    const error = new Error("required audit failed");
    const logger = { error: vi.fn(), warn: vi.fn() };

    await expect(
      recordAuditEvent({
        event: { ...event, criticality: "critical" },
        logger,
        sink: { record: vi.fn().mockRejectedValue(error) },
      }),
    ).rejects.toBe(error);
    expect(logger.error).toHaveBeenCalledOnce();
  });

  it("lets a recorder default policy be overridden per event", async () => {
    const logger = { error: vi.fn(), warn: vi.fn() };
    const recorder = createAuditRecorder({
      defaultPolicy: "important",
      logger,
      sink: { record: vi.fn().mockRejectedValue("offline") },
    });

    await expect(recorder.record(event)).resolves.toMatchObject({
      ok: false,
      policy: auditFailurePolicies.important,
    });
    await expect(recorder.record(event, "required")).rejects.toBe("offline");
  });
});
