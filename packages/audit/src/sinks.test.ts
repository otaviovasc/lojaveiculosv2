import { describe, expect, it } from "vitest";
import type { AuditEvent } from "./contracts.js";
import { createMemoryAuditSink, createNoopAuditSink } from "./sinks.js";

const event = {
  action: "test.recorded",
  actor: { id: "system", kind: "system" },
  entityId: "entity-1",
  entityType: "test",
  requestId: "request-1",
  storeId: null,
  tenantId: null,
} satisfies AuditEvent;

describe("audit sinks", () => {
  it("records and clears in-memory events", async () => {
    const sink = createMemoryAuditSink();

    await sink.record(event);
    expect(sink.events).toEqual([event]);

    sink.clear();
    expect(sink.events).toEqual([]);
  });

  it("copies the initial event collection", () => {
    const initial = [event];
    const sink = createMemoryAuditSink(initial);

    initial.length = 0;
    expect(sink.events).toEqual([event]);
  });

  it("provides a no-op sink for explicitly best-effort contexts", async () => {
    await expect(createNoopAuditSink().record(event)).resolves.toBeUndefined();
  });
});
