import { describe, expect, it } from "vitest";
import { auditEvents } from "@lojaveiculosv2/audit-db";
import {
  createDrizzleAuditSink,
  type DrizzleAuditSinkClient,
} from "./drizzleAuditSink.js";

describe("createDrizzleAuditSink", () => {
  it("persists audit events into the audit_events table", async () => {
    const db = createFakeAuditDb();
    const sink = createDrizzleAuditSink(db);

    await sink.record({
      action: "vehicle_listing.create",
      actor: {
        externalId: "clerk_1",
        id: "user_1",
        kind: "user",
      },
      category: "data_change",
      changes: [{ after: "available", path: "status" }],
      criticality: "high",
      dataClassification: "confidential",
      entityId: "listing_1",
      entityType: "vehicle_listing",
      failureTier: "important",
      metadata: { storeSlug: "test-store" },
      occurredAt: "2026-06-17T12:00:00.000Z",
      outcome: "succeeded",
      provider: { eventId: "evt_1", name: "asaas" },
      relatedEntities: [{ id: "store_1", type: "store" }],
      request: {
        correlationId: "corr_1",
        method: "POST",
        path: "/api/v1/inventory/listings",
        requestId: "req_1",
      },
      requestId: "req_1",
      severity: "info",
      source: { component: "http", service: "api" },
      storeId: "66666666-6666-4666-8666-666666666666",
      summary: "Created listing",
      tags: ["inventory"],
      target: { id: "listing_1", type: "vehicle_listing" },
      tenantId: "77777777-7777-4777-8777-777777777777",
    });

    expect(db.inserted).toEqual([
      expect.objectContaining({
        action: "vehicle_listing.create",
        actorId: "user_1",
        actorKind: "user",
        category: "data_change",
        correlationId: "corr_1",
        dataClassification: "confidential",
        entityId: "listing_1",
        entityType: "vehicle_listing",
        failureTier: "important",
        metadata: { storeSlug: "test-store" },
        occurredAt: new Date("2026-06-17T12:00:00.000Z"),
        providerEventId: "evt_1",
        providerName: "asaas",
        requestId: "req_1",
        storeId: "66666666-6666-4666-8666-666666666666",
        tenantId: "77777777-7777-4777-8777-777777777777",
      }),
    ]);
    expect(db.tables).toEqual([auditEvents]);
  });
});

function createFakeAuditDb() {
  const inserted: unknown[] = [];
  const tables: unknown[] = [];

  const db: DrizzleAuditSinkClient = {
    insert(table) {
      tables.push(table);
      return {
        async values(record) {
          inserted.push(record);
        },
      };
    },
  };

  return { ...db, inserted, tables };
}
