import { describe, expect, it } from "vitest";
import {
  createContextualAuditSink,
  createMemoryAuditSink,
} from "./auditSink.js";

describe("contextual audit sink", () => {
  it("enriches audit events with authoritative context", async () => {
    const audit = createMemoryAuditSink();
    const sink = createContextualAuditSink({
      actor: { id: "user_1", kind: "user" },
      request: {
        correlationId: "corr_1",
        method: "POST",
        path: "/api/v1/vehicles",
        requestId: "req_1",
      },
      sink: audit,
      source: { component: "vehicles", service: "api" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    await sink.record({
      action: "vehicle.create",
      actor: { id: "spoofed", kind: "system" },
      entityId: "vehicle_1",
      entityType: "vehicle",
      request: { method: "GET", requestId: "spoofed_request" },
      requestId: "spoofed_request",
      storeId: "spoofed_store",
      tenantId: "spoofed_tenant",
    });

    expect(audit.events[0]).toMatchObject({
      actor: { id: "user_1", kind: "user" },
      correlationId: "corr_1",
      request: {
        correlationId: "corr_1",
        method: "POST",
        path: "/api/v1/vehicles",
        requestId: "req_1",
      },
      requestId: "req_1",
      source: { component: "vehicles", service: "api" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });
  });
});
