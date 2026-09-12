import { describe, expect, it, vi } from "vitest";
import { approveBillingPlanQuote } from "./drizzleBillingPlanHireQuotes.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

describe("Drizzle billing plan quote approval", () => {
  it("approves the quote and enqueues its audit in one transaction", async () => {
    const approved = quoteRow();
    const fake = fakeApprovalDb(approved);

    await expect(
      approveBillingPlanQuote(fake.db, {
        actorId: "actor_1",
        audit: auditIntent,
        expiresAt,
        quoteId,
        quotedCents: 99_700,
        storeId: storeId as never,
        tenantId: tenantId as never,
      }),
    ).resolves.toMatchObject({ id: quoteId, status: "approved" });

    expect(fake.transaction).toHaveBeenCalledTimes(1);
    expect(fake.updatedValues).toMatchObject({
      approvedByActorId: "actor_1",
      quotedCents: 99_700,
      status: "approved",
    });
    expect(fake.auditValues).toEqual([
      expect.objectContaining({
        action: "billing.plan_quote.approved",
        actorId: "actor_1",
        entityId: quoteId,
        entityType: "billing_plan_quote",
        idempotencyKey: `billing-audit:quote:${quoteId}:approved`,
        metadata: {
          catalogVersion,
          planId,
          quoteId,
          quotedCents: 99_700,
          status: "approved",
        },
        requestId: "request_1",
      }),
    ]);
  });

  it("does not report approval when the durable audit cannot be accepted", async () => {
    const fake = fakeApprovalDb(quoteRow(), true);

    await expect(
      approveBillingPlanQuote(fake.db, {
        actorId: "actor_1",
        audit: auditIntent,
        expiresAt,
        quoteId,
        quotedCents: 99_700,
        storeId: storeId as never,
        tenantId: tenantId as never,
      }),
    ).rejects.toThrow("audit unavailable");
    expect(fake.transaction).toHaveBeenCalledTimes(1);
  });
});

function fakeApprovalDb(
  approved: ReturnType<typeof quoteRow>,
  rejectAudit = false,
) {
  const auditValues: unknown[] = [];
  let updatedValues: unknown;
  const update = vi.fn(() => ({
    set(value: unknown) {
      updatedValues = value;
      return {
        where: () => ({ returning: vi.fn(async () => [approved]) }),
      };
    },
  }));
  const insert = vi.fn(() => ({
    values(value: unknown) {
      auditValues.push(value);
      return {
        onConflictDoNothing: vi.fn(async () => {
          if (rejectAudit) throw new Error("audit unavailable");
        }),
      };
    },
  }));
  const tx = { insert, update };
  const transaction = vi.fn(async (callback: (value: unknown) => unknown) =>
    callback(tx),
  );
  return {
    auditValues,
    db: { transaction } as unknown as DrizzleBillingClient,
    transaction,
    get updatedValues() {
      return updatedValues;
    },
  };
}

function quoteRow() {
  return {
    approvedAt: new Date("2026-08-26T10:00:00.000Z"),
    approvedByActorId: "actor_1",
    catalogVersion,
    createdAt: new Date("2026-08-26T09:00:00.000Z"),
    expiresAt,
    id: quoteId,
    planId,
    quotedCents: 99_700,
    requestedByActorId: "actor_1",
    status: "approved",
    storeId,
    tenantId,
    updatedAt: new Date("2026-08-26T10:00:00.000Z"),
  };
}

const auditIntent = {
  actorId: "actor_1",
  actorKind: "user" as const,
  requestId: "request_1",
};
const catalogVersion = "2026-08-v3";
const expiresAt = new Date("2026-09-26T10:00:00.000Z");
const planId = "00000000-0000-4000-8000-000000000001";
const quoteId = "00000000-0000-4000-8000-000000000010";
const storeId = "00000000-0000-4000-8000-000000000002";
const tenantId = "00000000-0000-4000-8000-000000000003";
