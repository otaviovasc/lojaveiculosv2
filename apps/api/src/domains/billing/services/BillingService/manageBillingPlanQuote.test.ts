import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { BillingPlanHireRepository } from "../../ports/billingPlanHireRepository.js";
import { createUnusedBillingRepository } from "../../testSupportBillingRepository.js";
import {
  approveBillingPlanQuote,
  BillingPlanQuoteApprovalError,
  requestBillingPlanQuote,
} from "./manageBillingPlanQuote.js";

describe("approveBillingPlanQuote", () => {
  it.each(["owner", "agency"] as const)(
    "rejects a common %s account even with billing.manage",
    async (membershipRole) => {
      const repository = createRepository();

      await expect(
        approveBillingPlanQuote(
          createContext({ membershipRole, platformAdmin: false }),
          quoteApproval,
          ports(repository),
        ),
      ).rejects.toBeInstanceOf(BillingPlanQuoteApprovalError);
      expect(repository.approveQuote).not.toHaveBeenCalled();
    },
  );

  it("allows an authenticated platform administrator to approve a quote", async () => {
    const repository = createRepository();
    const context = createContext({ platformAdmin: true });

    await expect(
      approveBillingPlanQuote(context, quoteApproval, ports(repository)),
    ).resolves.toMatchObject({ id: "quote_1", status: "approved" });
    expect(repository.approveQuote).toHaveBeenCalledWith({
      actorId: "developer_1",
      audit: {
        actorId: "developer_1",
        actorKind: "user",
        requestId: "request_1",
      },
      ...quoteApproval,
      storeId: "store_1",
      tenantId: "tenant_1",
    });
  });

  it("passes durable actor evidence when requesting a quote", async () => {
    const repository = createRepository();
    const context = createContext({ platformAdmin: false });

    await expect(
      requestBillingPlanQuote(context, "plan_escala", ports(repository)),
    ).resolves.toMatchObject({ id: "quote_1", status: "requested" });
    expect(repository.requestQuote).toHaveBeenCalledWith({
      actorId: "developer_1",
      audit: {
        actorId: "developer_1",
        actorKind: "user",
        requestId: "request_1",
      },
      planId: "plan_escala",
      storeId: "store_1",
      tenantId: "tenant_1",
    });
  });
});

const quoteApproval = {
  expiresAt: new Date("2026-09-30T00:00:00.000Z"),
  quoteId: "quote_1",
  quotedCents: 89_700,
};

function createContext(input: {
  membershipRole?: "agency" | "owner";
  platformAdmin: boolean;
}) {
  const audit = { record: vi.fn(async () => undefined) };
  return {
    ...createServiceContext({
      actor: { id: "developer_1", kind: "user" },
      audit,
      ...(input.membershipRole ? { membershipRole: input.membershipRole } : {}),
      permissions: ["billing.manage"],
      request: { requestId: "request_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    audit,
    platformAdmin: input.platformAdmin,
  };
}

function createRepository(): BillingPlanHireRepository {
  return {
    approveQuote: vi.fn(async () => ({
      catalogVersion: "2026-08-v3",
      expiresAt: quoteApproval.expiresAt,
      id: "quote_1",
      planId: "plan_escala",
      quotedCents: quoteApproval.quotedCents,
      status: "approved" as const,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    })),
    beginCheckoutRequest: vi.fn(),
    bindCheckout: vi.fn(),
    bindRenewal: vi.fn(),
    failHire: vi.fn(),
    findHire: vi.fn(),
    prepareHire: vi.fn(),
    requestQuote: vi.fn(async () => ({
      catalogVersion: "2026-08-v3",
      expiresAt: null,
      id: "quote_1",
      planId: "plan_escala",
      quotedCents: null,
      status: "requested" as const,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    })),
    restoreFreeDowngradeCancellation: vi.fn(),
    scheduleFreeDowngrade: vi.fn(),
    supersedeFreeDowngrade: vi.fn(),
  };
}

function ports(billingPlanHireRepository: BillingPlanHireRepository) {
  return {
    billingPlanHireRepository,
    billingRepository: createUnusedBillingRepository(),
  };
}
