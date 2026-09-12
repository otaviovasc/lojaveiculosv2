import { currentBillingCatalog } from "../../../../domains/billing/catalog/currentBillingCatalog.js";
import { describe, expect, it } from "vitest";
import { createMemoryBillingPlanHireRepository } from "./billingPlanHireRepository.js";

describe("memory billing plan quote repository", () => {
  it("grants only one checkout claim across concurrent retries", async () => {
    const repository = createMemoryBillingPlanHireRepository();
    const plan = currentBillingCatalog.plans.find(
      (candidate) => candidate.code === "essencial",
    );
    if (!plan) throw new Error("Essencial plan fixture is unavailable.");
    const scope = {
      actorId: "actor_1",
      audit: {
        actorId: "actor_1",
        actorKind: "user" as const,
        requestId: "request_1",
      },
      billingTypes: ["PIX"] as const,
      idempotencyKey: "concurrent-checkout-claim",
      planId: plan.id,
      storeId: "00000000-0000-4000-8000-000000000002" as never,
      tenantId: "00000000-0000-4000-8000-000000000003" as never,
    };
    const prepared = await repository.prepareHire(scope);
    const claim = {
      hireId: prepared.hire.id,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    };

    const results = await Promise.all([
      repository.beginCheckoutRequest(claim),
      repository.beginCheckoutRequest(claim),
    ]);

    expect(results.filter((result) => result.claimed)).toHaveLength(1);
    expect(results.filter((result) => !result.claimed)).toHaveLength(1);
  });

  it.each([0, -1, Number.MAX_SAFE_INTEGER + 1])(
    "rejects an invalid approved quote price of %s cents",
    async (quotedCents) => {
      const repository = createMemoryBillingPlanHireRepository();
      const escala = currentBillingCatalog.plans.find(
        (plan) => plan.code === "escala",
      );
      if (!escala) throw new Error("Escala plan fixture is unavailable.");
      const scope = {
        actorId: "actor_1",
        audit: auditIntent,
        planId: escala.id,
        storeId: "00000000-0000-4000-8000-000000000002" as never,
        tenantId: "00000000-0000-4000-8000-000000000003" as never,
      };
      const quote = await repository.requestQuote(scope);

      await expect(
        repository.approveQuote({
          ...scope,
          expiresAt: new Date(Date.now() + 60_000),
          quoteId: quote.id,
          quotedCents,
        }),
      ).rejects.toThrow("Billing plan quote price is invalid.");
    },
  );

  it("reuses an open Escala quote only inside the same tenant and store", async () => {
    const repository = createMemoryBillingPlanHireRepository();
    const escala = currentBillingCatalog.plans.find(
      (plan) => plan.code === "escala",
    );
    if (!escala) throw new Error("Escala plan fixture is unavailable.");
    const input = {
      actorId: "actor_1",
      audit: auditIntent,
      planId: escala.id,
      storeId: "00000000-0000-4000-8000-000000000002" as never,
      tenantId: "00000000-0000-4000-8000-000000000003" as never,
    };

    const first = await repository.requestQuote(input);
    const duplicate = await repository.requestQuote({
      ...input,
      actorId: "actor_2",
    });
    const otherStore = await repository.requestQuote({
      ...input,
      storeId: "00000000-0000-4000-8000-000000000004" as never,
    });

    expect(duplicate.id).toBe(first.id);
    expect(otherStore.id).not.toBe(first.id);
  });
});

const auditIntent = {
  actorId: "actor_1",
  actorKind: "user" as const,
  requestId: "request_1",
};
