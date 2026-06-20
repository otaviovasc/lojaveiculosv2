import { describe, expect, it } from "vitest";
import type {
  InternalAuditEvent,
  InternalAuditSinkFailure,
} from "../../../domains/internal/ports/internalMonitoringRepository.js";
import { createInternalHealthSnapshot } from "./internalMonitoringSnapshot.js";

describe("createInternalHealthSnapshot", () => {
  it("computes admin observability signals from audit data", () => {
    const snapshot = createInternalHealthSnapshot(
      [
        event({
          action: "inventory.create",
          actorId: "user_1",
          outcome: "succeeded",
        }),
        event({
          action: "inventory.create",
          actorId: "user_1",
          outcome: "failed",
          severity: "error",
        }),
        event({
          action: "identity.access",
          actorId: "user_2",
          criticality: "critical",
          outcome: "denied",
          severity: "warning",
        }),
      ],
      [
        {
          attempts: 3,
          createdAt: new Date("2026-01-01T09:00:00.000Z"),
          failureTier: "required",
          id: "failure_1",
          lastError: "database unavailable",
          requestId: "req_1",
          resolvedAt: null,
          sinkName: "audit-db",
        },
      ],
    );

    expect(snapshot.status).toBe("critical");
    expect(snapshot.summary).toMatchObject({
      criticalEvents: 1,
      deniedEvents: 1,
      failedEvents: 1,
      openSinkFailures: 1,
      recentEvents: 3,
      uniqueActors: 2,
      warningEvents: 1,
    });
    expect(snapshot.alerts.map((alert) => alert.key)).toEqual([
      "failed-events",
      "required-sink-failures",
      "denied-events",
    ]);
    expect(snapshot.actionMetrics[0]).toMatchObject({
      action: "inventory.create",
      failedCount: 1,
      total: 2,
    });
    expect(snapshot.sinkMetrics[0]).toMatchObject({
      failureTier: "required",
      openFailures: 1,
      sinkName: "audit-db",
      totalAttempts: 3,
    });
  });
});

let eventSequence = 0;

function event(
  overrides: Partial<InternalAuditEvent> = {},
): InternalAuditEvent {
  return {
    action: "internal.health.read",
    actorId: "user_1",
    actorKind: "user",
    category: "data_access",
    criticality: "low",
    entityId: "entity_1",
    entityType: "entity",
    id: `event_${++eventSequence}`,
    occurredAt: new Date("2026-01-01T10:00:00.000Z"),
    outcome: "succeeded",
    requestId: "req_1",
    severity: "info",
    storeId: "store_1",
    summary: "Audit event",
    tenantId: "tenant_1",
    ...overrides,
  };
}
