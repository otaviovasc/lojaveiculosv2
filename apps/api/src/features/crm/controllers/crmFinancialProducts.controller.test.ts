import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { FinanceAutoEntryEvaluationError } from "../../../domains/finance/services/FinanceService/financeAutoEntryEvaluator.js";
import { createCrmFeature } from "./crm.controller.js";
import {
  createCrmTestContext,
  createLead,
  FULL_PERMISSIONS,
  postFinancialProduct,
} from "./crmFinancialProducts.controller.testSupport.js";
import { createCrmServices } from "./crmServices.js";

describe("CRM lead financial-product route", () => {
  it("validates the V1 contract and reuses the activity on retry", async () => {
    const materializeAutoEntries = vi.fn(async () => []);
    const feature = createCrmFeature({
      contextFactory: async () =>
        Object.assign(
          createServiceContext({
            actor: { id: "user_1", kind: "user" },
            permissions: [
              "finance.create",
              "lead.create",
              "lead.read",
              "lead.update",
            ],
            request: { requestId: "req_1" },
            storeId: "store_1",
            tenantId: "tenant_1",
          }),
          { entitlements: ["crm"] },
        ),
      financeServices: {
        materializeAutoEntries: materializeAutoEntries as never,
      },
      services: createCrmServices(),
    });
    const leadResponse = await feature.request("/leads", {
      body: JSON.stringify({ buyerName: "Ana", source: "manual" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const lead = (await leadResponse.json()) as { id: string };
    const body = {
      creditLetterAmountCents: 10_000_000,
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      sellerUserId: "22222222-2222-4222-8222-222222222222",
      type: "consortium",
    };

    const first = await feature.request(
      `/leads/${lead.id}/financial-products`,
      {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    const second = await feature.request(
      `/leads/${lead.id}/financial-products`,
      {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );

    expect(first.status, await first.clone().text()).toBe(201);
    expect(second.status).toBe(201);
    const firstBody = (await first.json()) as { activity: { id: string } };
    const secondBody = (await second.json()) as { activity: { id: string } };
    expect(secondBody.activity.id).toBe(firstBody.activity.id);
    expect(materializeAutoEntries).toHaveBeenCalledTimes(2);
    expect(materializeAutoEntries).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        basisCents: { consortium: 10_000_000 },
        event: "consortium_sold",
        sourceId: firstBody.activity.id,
      }),
    );
  });

  it("returns 409 when a store-scoped key is reused with another payload", async () => {
    const materializeAutoEntries = vi.fn(async () => []);
    const feature = createCrmFeature({
      contextFactory: async () => createCrmTestContext(FULL_PERMISSIONS),
      financeServices: {
        materializeAutoEntries: materializeAutoEntries as never,
      },
      services: createCrmServices(),
    });
    const lead = await createLead(feature, "Ana");
    const body = {
      creditLetterAmountCents: 10_000_000,
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
      sellerUserId: "22222222-2222-4222-8222-222222222222",
      type: "consortium",
    } as const;

    const first = await postFinancialProduct(feature, lead.id, body);
    const conflict = await postFinancialProduct(feature, lead.id, {
      ...body,
      creditLetterAmountCents: 11_000_000,
    });

    expect(first.status).toBe(201);
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toEqual(
      expect.objectContaining({ code: "CRM_ACTIVITY_IDEMPOTENCY_CONFLICT" }),
    );
    expect(materializeAutoEntries).toHaveBeenCalledTimes(1);
  });

  it("denies lead editors without finance.create before writing activity", async () => {
    let permissions = FULL_PERMISSIONS;
    const materializeAutoEntries = vi.fn(async () => []);
    const services = createCrmServices();
    const feature = createCrmFeature({
      contextFactory: async () => createCrmTestContext(permissions),
      financeServices: {
        materializeAutoEntries: materializeAutoEntries as never,
      },
      services,
    });
    const lead = await createLead(feature, "Ana");
    permissions = ["lead.read", "lead.update"];

    const denied = await postFinancialProduct(feature, lead.id, {
      creditLetterAmountCents: 10_000_000,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      sellerUserId: "22222222-2222-4222-8222-222222222222",
      type: "consortium",
    });

    expect(denied.status).toBe(403);
    await expect(denied.json()).resolves.toEqual(
      expect.objectContaining({ code: "AUTHORIZATION_DENIED" }),
    );
    await expect(
      services.listActivities(createCrmTestContext(FULL_PERMISSIONS), {
        leadId: lead.id,
        limit: 10,
      }),
    ).resolves.toEqual([]);
    expect(materializeAutoEntries).not.toHaveBeenCalled();
  });

  it("requires lead.update again on an exact retry", async () => {
    let permissions = FULL_PERMISSIONS;
    const materializeAutoEntries = vi.fn(async () => []);
    const feature = createCrmFeature({
      contextFactory: async () => createCrmTestContext(permissions),
      financeServices: {
        materializeAutoEntries: materializeAutoEntries as never,
      },
      services: createCrmServices(),
    });
    const lead = await createLead(feature, "Ana");
    const body = {
      creditLetterAmountCents: 10_000_000,
      idempotencyKey: "55555555-5555-4555-8555-555555555555",
      sellerUserId: "22222222-2222-4222-8222-222222222222",
      type: "consortium",
    } as const;
    expect((await postFinancialProduct(feature, lead.id, body)).status).toBe(
      201,
    );

    permissions = ["finance.create", "lead.read"];
    const denied = await postFinancialProduct(feature, lead.id, body);

    expect(denied.status).toBe(403);
    await expect(denied.json()).resolves.toEqual(
      expect.objectContaining({ code: "AUTHORIZATION_DENIED" }),
    );
    expect(materializeAutoEntries).toHaveBeenCalledTimes(1);
  });

  it("does not allow the same store key to move between leads", async () => {
    const materializeAutoEntries = vi.fn(async () => []);
    const feature = createCrmFeature({
      contextFactory: async () => createCrmTestContext(FULL_PERMISSIONS),
      financeServices: {
        materializeAutoEntries: materializeAutoEntries as never,
      },
      services: createCrmServices(),
    });
    const firstLead = await createLead(feature, "Ana");
    const secondLead = await createLead(feature, "Bruno");
    const body = {
      premiumCents: 500_000,
      appliedCommissionBasisPoints: 1_000,
      idempotencyKey: "66666666-6666-4666-8666-666666666666",
      sellerUserId: "22222222-2222-4222-8222-222222222222",
      type: "insurance",
    } as const;

    expect(
      (await postFinancialProduct(feature, firstLead.id, body)).status,
    ).toBe(201);
    const conflict = await postFinancialProduct(feature, secondLead.id, body);

    expect(conflict.status).toBe(409);
    expect(materializeAutoEntries).toHaveBeenCalledTimes(1);
  });

  it("maps invalid financial-product recipients to a CRM 400 response", async () => {
    const materializeAutoEntries = vi.fn(async () => {
      throw new FinanceAutoEntryEvaluationError(
        "Seller must have an active membership in the current store.",
      );
    });
    const feature = createCrmFeature({
      contextFactory: async () => createCrmTestContext(FULL_PERMISSIONS),
      financeServices: {
        materializeAutoEntries: materializeAutoEntries as never,
      },
      services: createCrmServices(),
    });
    const lead = await createLead(feature, "Ana");

    const response = await postFinancialProduct(feature, lead.id, {
      creditLetterAmountCents: 10_000_000,
      idempotencyKey: "77777777-7777-4777-8777-777777777777",
      sellerUserId: "22222222-2222-4222-8222-222222222222",
      type: "consortium",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        code: "CRM_FINANCIAL_PRODUCT_VALIDATION_ERROR",
      }),
    );
  });
});
