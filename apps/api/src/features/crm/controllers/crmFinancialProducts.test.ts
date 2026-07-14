import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { FinanceServices } from "../../finance/controllers/financeServices.js";
import type { CrmServices } from "./crmServices.js";
import {
  createCrmLeadFinancialProduct,
  type CrmFinancialProductTransactionRunner,
} from "./crmFinancialProducts.js";

const context = createServiceContext({
  actor: { id: "user_1", kind: "user" },
  permissions: ["finance.create"],
  request: { requestId: "req_1" },
  storeId: "store_1",
  tenantId: "tenant_1",
});

describe("createCrmLeadFinancialProduct", () => {
  it("requires finance.create before creating the CRM activity", async () => {
    const createActivity = vi.fn(async () => buildActivity());
    const materializeAutoEntries = vi.fn(async () => []);
    const deniedContext = createServiceContext({
      actor: { id: "user_1", kind: "user" },
      permissions: ["lead.update"],
      request: { requestId: "req_denied" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    await expect(
      createCrmLeadFinancialProduct(
        deniedContext,
        "lead_1",
        {
          creditLetterAmountCents: 10_000_000,
          idempotencyKey: "33333333-3333-4333-8333-333333333333",
          sellerUserId: "22222222-2222-4222-8222-222222222222",
          type: "consortium",
        },
        { createActivity: createActivity as never },
        { materializeAutoEntries: materializeAutoEntries as never },
      ),
    ).rejects.toThrow("Missing permission: finance.create");
    expect(createActivity).not.toHaveBeenCalled();
    expect(materializeAutoEntries).not.toHaveBeenCalled();
  });

  it("materializes the exact V1 insurance bases with activity provenance", async () => {
    const activity = buildActivity();
    const services = {
      createActivity: vi.fn(async () => activity),
    } as unknown as Pick<CrmServices, "createActivity">;
    const materializeAutoEntries = vi.fn(async () => []);
    const finance = {
      materializeAutoEntries,
    } as unknown as Pick<FinanceServices, "materializeAutoEntries">;

    await createCrmLeadFinancialProduct(
      context,
      "lead_1",
      {
        appliedCommissionBasisPoints: 1_000,
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
        premiumCents: 500_000,
        sellerUserId: "22222222-2222-4222-8222-222222222222",
        type: "insurance",
      },
      services,
      finance,
    );

    expect(services.createActivity).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
        leadId: "lead_1",
      }),
    );
    expect(
      vi.mocked(services.createActivity).mock.calls[0]?.[1]
        .idempotencyFingerprint,
    ).toMatch(/^[a-f0-9]{64}$/);
    expect(materializeAutoEntries).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        basisCents: { insurance_commission: 50_000, premium: 500_000 },
        event: "insurance_issued",
        leadId: "lead_1",
        sellerUserId: "22222222-2222-4222-8222-222222222222",
        sourceId: activity.id,
        sourceRevision: 1,
      }),
    );
  });

  it("creates a consortium activity and preserves ppm-ready basis cents", async () => {
    const activity = buildActivity({ metadata: {} });
    const services = {
      createActivity: vi.fn(async () => activity),
    } as unknown as Pick<CrmServices, "createActivity">;
    const materializeAutoEntries = vi.fn(async () => []);
    const finance = {
      materializeAutoEntries,
    } as unknown as Pick<FinanceServices, "materializeAutoEntries">;

    await createCrmLeadFinancialProduct(
      context,
      "lead_1",
      {
        creditLetterAmountCents: 10_000_000,
        idempotencyKey: "33333333-3333-4333-8333-333333333333",
        sellerUserId: "22222222-2222-4222-8222-222222222222",
        type: "consortium",
      },
      services,
      finance,
    );

    expect(services.createActivity).toHaveBeenCalledOnce();
    expect(materializeAutoEntries).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        basisCents: { consortium: 10_000_000 },
        event: "consortium_sold",
        sourceId: activity.id,
      }),
    );
  });

  it("rolls back the staged CRM activity when finance materialization fails", async () => {
    const failure = new Error("inactive seller");
    const committedActivities: ReturnType<typeof buildActivity>[] = [];
    const stagedActivity = buildActivity();
    const transactionalCreateActivity = vi.fn(async () => stagedActivity);
    const transactionalMaterialize = vi.fn(async () => {
      throw failure;
    });
    const transactionRunner: CrmFinancialProductTransactionRunner = {
      async runInTransaction(operation) {
        const stagedActivities: ReturnType<typeof buildActivity>[] = [];
        const result = await operation({
          createActivity: (async () => {
            const activity = await transactionalCreateActivity();
            stagedActivities.push(activity);
            return activity;
          }) as never,
          materializeAutoEntries: transactionalMaterialize as never,
        });
        committedActivities.push(...stagedActivities);
        return result;
      },
    };
    const rootCreateActivity = vi.fn(async () => buildActivity());
    const rootMaterialize = vi.fn(async () => []);

    await expect(
      createCrmLeadFinancialProduct(
        context,
        "lead_1",
        {
          creditLetterAmountCents: 10_000_000,
          idempotencyKey: "55555555-5555-4555-8555-555555555555",
          sellerUserId: "22222222-2222-4222-8222-222222222222",
          type: "consortium",
        },
        { createActivity: rootCreateActivity as never },
        { materializeAutoEntries: rootMaterialize as never },
        transactionRunner,
      ),
    ).rejects.toThrow(failure);
    expect(transactionalCreateActivity).toHaveBeenCalledOnce();
    expect(transactionalMaterialize).toHaveBeenCalledOnce();
    expect(committedActivities).toEqual([]);
    expect(rootCreateActivity).not.toHaveBeenCalled();
    expect(rootMaterialize).not.toHaveBeenCalled();
  });
});

function buildActivity(override: Record<string, unknown> = {}) {
  return {
    activityType: "note" as const,
    content: "Produto financeiro",
    createdAt: new Date("2026-07-13T12:00:00.000Z"),
    createdByUserId: "user_1",
    direction: "internal" as const,
    id: "44444444-4444-4444-8444-444444444444",
    idempotencyFingerprint: "a".repeat(64),
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    leadId: "lead_1",
    metadata: {
      financialProduct: {
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
      },
    },
    occurredAt: new Date("2026-07-13T12:00:00.000Z"),
    priority: 0,
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: new Date("2026-07-13T12:00:00.000Z"),
    ...override,
  };
}
