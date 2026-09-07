import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import {
  buildScheduledMessageUpdateFilters,
  dueScheduledPredicate,
  processableScheduledMessagePredicate,
  processableSpecialDatePredicate,
} from "./drizzleCrmScheduledMessageFilters.js";

const dialect = new PgDialect();
const scope = {
  storeId: "00000000-0000-4000-0000-000000000001" as StoreId,
  tenantId: "00000000-0000-4000-0000-000000000002" as TenantId,
};

describe("Drizzle CRM scheduled-message predicates", () => {
  it("keeps the lease clock independent from a future scheduling cutoff", () => {
    const dueAt = new Date("2030-01-01T10:00:00.000Z");
    const now = new Date("2026-09-07T15:00:00.000Z");
    const query = dialect.sqlToQuery(
      dueScheduledPredicate(dueAt, new Date(now.getTime() - 120_000), now)!,
    );
    expect(query.sql).toContain('"crm_scheduled_messages"."status"');
    expect(query.sql).toContain("scheduledDeliveryNextAttemptAt");
    expect(query.params).toEqual(
      expect.arrayContaining([dueAt.toISOString(), now.toISOString()]),
    );
  });

  it("allows stale sending replay while keeping paused pending rows blocked", () => {
    const query = dialect
      .sqlToQuery(processableScheduledMessagePredicate()!)
      .sql.replaceAll(/\s+/g, " ");
    expect(query).toContain('"crm_scheduled_messages"."status" =');
    expect(query).toContain('"crm_campaigns"."status" =');
  });

  it("keeps stale special-date sends eligible for receipt-first replay", () => {
    const query = dialect
      .sqlToQuery(processableSpecialDatePredicate([])!)
      .sql.replaceAll(/\s+/g, " ");
    expect(query).toContain('"crm_scheduled_messages"."status" =');
    expect(query).toContain("specialDate");
  });

  it("renders a revision fence for completion and failure updates", () => {
    const expectedUpdatedAt = new Date("2026-09-07T15:00:00.123Z");
    const [filter] = buildScheduledMessageUpdateFilters({
      expectedUpdatedAt,
      id: "00000000-0000-4000-0000-000000000003",
      status: "sent",
      ...scope,
    });
    const query = dialect.sqlToQuery(
      buildScheduledMessageUpdateFilters({
        expectedUpdatedAt,
        id: "00000000-0000-4000-0000-000000000003",
        status: "sent",
        ...scope,
      })[3]!,
    );
    expect(filter).toBeDefined();
    expect(query.sql).toContain('"crm_scheduled_messages"."updated_at" =');
    expect(query.params).toContain(expectedUpdatedAt.toISOString());
  });
});
