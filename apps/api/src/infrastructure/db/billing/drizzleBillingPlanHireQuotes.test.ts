import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import { requestBillingPlanQuote } from "./drizzleBillingPlanHireQuotes.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

describe("Drizzle billing plan quote requests", () => {
  it("reuses the newest open requested quote under a scoped advisory lock", async () => {
    const existing = quoteRow({ status: "requested" });
    const fake = fakeDb([
      [{ version: catalogVersion }],
      [{ id: planId }],
      [existing],
    ]);

    await expect(
      requestBillingPlanQuote(fake.db, input()),
    ).resolves.toMatchObject({
      id: existing.id,
      status: "requested",
    });
    expect(fake.insert).not.toHaveBeenCalled();
    expect(fake.transaction).toHaveBeenCalledTimes(1);
    const lock = new PgDialect().sqlToQuery(fake.executed[0] as SQL);
    expect(lock.sql).toContain("pg_advisory_xact_lock");
    expect(lock.params).toContain(
      `${tenantId}:${storeId}:${planId}:plan-quote`,
    );
    expect(fake.events[0]).toBe("lock");
  });

  it("reuses only an approved quote with complete valid semantics in the same scope", async () => {
    const approved = quoteRow({
      approvedAt: new Date("2026-08-26T10:00:00.000Z"),
      approvedByActorId: "support_1",
      expiresAt: new Date("2026-09-26T10:00:00.000Z"),
      quotedCents: 99_700,
      status: "approved",
    });
    const fake = fakeDb([
      [{ version: catalogVersion }],
      [{ id: planId }],
      [],
      [approved],
    ]);

    await expect(
      requestBillingPlanQuote(fake.db, input()),
    ).resolves.toMatchObject({
      id: approved.id,
      quotedCents: 99_700,
      status: "approved",
    });
    expect(fake.insert).not.toHaveBeenCalled();
    const approvedWhere = new PgDialect().sqlToQuery(fake.wheres[3] as SQL);
    expect(approvedWhere.sql).toContain('"approved_at" is not null');
    expect(approvedWhere.sql).toContain('"approved_by_actor_id" is not null');
    expect(approvedWhere.sql).toContain('"quoted_cents" >');
    expect(approvedWhere.params).toEqual(
      expect.arrayContaining([
        catalogVersion,
        planId,
        storeId,
        tenantId,
        "approved",
        0,
      ]),
    );
  });

  it("creates one requested quote when no reusable scoped quote exists", async () => {
    const created = quoteRow({ status: "requested" });
    const fake = fakeDb(
      [[{ version: catalogVersion }], [{ id: planId }], [], []],
      created,
    );

    await expect(
      requestBillingPlanQuote(fake.db, input()),
    ).resolves.toMatchObject({
      id: created.id,
      status: "requested",
    });
    expect(fake.insert).toHaveBeenCalledTimes(1);
    expect(fake.insertedValues).toMatchObject({
      catalogVersion,
      planId,
      status: "requested",
      storeId,
      tenantId,
    });
    const requestedWhere = new PgDialect().sqlToQuery(fake.wheres[2] as SQL);
    expect(requestedWhere.params).toEqual(
      expect.arrayContaining([
        catalogVersion,
        planId,
        storeId,
        tenantId,
        "requested",
      ]),
    );
  });
});

function fakeDb(selectResults: unknown[][], inserted = quoteRow({})) {
  const executed: unknown[] = [];
  const events: string[] = [];
  const wheres: unknown[] = [];
  let insertedValues: unknown;
  const insert = vi.fn(() => ({
    values(value: unknown) {
      insertedValues = value;
      return { returning: vi.fn(async () => [inserted]) };
    },
  }));
  const transaction = vi.fn(async (callback: (tx: unknown) => unknown) =>
    callback(tx),
  );
  const tx = {
    execute: vi.fn(async (statement: unknown) => {
      events.push("lock");
      executed.push(statement);
      return [];
    }),
    insert,
    select: vi.fn(() => {
      events.push("select");
      const query = {
        from: () => query,
        innerJoin: () => query,
        limit: vi.fn(async () => selectResults.shift() ?? []),
        orderBy: () => query,
        where: (condition: unknown) => {
          wheres.push(condition);
          return query;
        },
      };
      return query;
    }),
  };
  return {
    db: { transaction } as unknown as DrizzleBillingClient,
    events,
    executed,
    get insertedValues() {
      return insertedValues;
    },
    insert,
    transaction,
    wheres,
  };
}

function input() {
  return {
    actorId: "actor_1",
    planId,
    storeId: storeId as never,
    tenantId: tenantId as never,
  };
}

function quoteRow(overrides: Record<string, unknown> = {}) {
  return {
    approvedAt: null,
    approvedByActorId: null,
    catalogVersion,
    createdAt: new Date("2026-08-26T09:00:00.000Z"),
    expiresAt: null,
    id: "00000000-0000-4000-8000-000000000010",
    planId,
    quotedCents: null,
    requestedByActorId: "actor_1",
    status: "requested",
    storeId,
    tenantId,
    updatedAt: new Date("2026-08-26T09:00:00.000Z"),
    ...overrides,
  };
}

const catalogVersion = "2026-08-v3";
const planId = "00000000-0000-4000-8000-000000000001";
const storeId = "00000000-0000-4000-8000-000000000002";
const tenantId = "00000000-0000-4000-8000-000000000003";
