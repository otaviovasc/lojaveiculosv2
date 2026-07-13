import { salePayments, sales } from "@lojaveiculosv2/db";
import { describe, expect, it } from "vitest";
import type { CreateSaleCorrectionRevisionInput } from "../../../domains/sales/ports/salesRepository.js";
import { createDrizzleSaleCorrection } from "./drizzleSalesCorrection.js";
import type { DrizzleSalesClient } from "./drizzleSalesRepository.js";

describe("drizzle sale correction", () => {
  it("rolls back the current-revision flip when payment insertion fails", async () => {
    const harness = createTransactionHarness();

    await expect(
      createDrizzleSaleCorrection(
        harness.db as unknown as DrizzleSalesClient,
        { storeId: "store_1", tenantId: "tenant_1" },
        correctionInput(),
      ),
    ).rejects.toThrow("simulated payment insert failure");

    expect(harness.state).toEqual({
      correctionCount: 0,
      originalIsCurrentRevision: true,
    });
  });
});

function createTransactionHarness() {
  const state: FakeState = {
    correctionCount: 0,
    originalIsCurrentRevision: true,
  };
  const db = {
    transaction: async <Result>(
      callback: (transaction: unknown) => Promise<Result>,
    ) => {
      const working = { ...state };
      const result = await callback(createTransactionClient(working));
      Object.assign(state, working);
      return result;
    },
  };
  return { db, state };
}

function createTransactionClient(working: FakeState) {
  return {
    insert: (table: unknown) => ({
      values: (_values: unknown) => ({
        returning: async () => {
          if (table === salePayments) {
            throw new Error("simulated payment insert failure");
          }
          if (table !== sales) throw new Error("Unexpected insert table.");
          working.correctionCount += 1;
          return [saleRow("correction_1", true, 2)];
        },
      }),
    }),
    update: (table: unknown) => ({
      set: (_values: unknown) => ({
        where: (_where: unknown) => ({
          returning: async () => {
            if (table !== sales) throw new Error("Unexpected update table.");
            working.originalIsCurrentRevision = false;
            return [saleRow("sale_1", false, 1)];
          },
        }),
      }),
    }),
  };
}

function saleRow(id: string, isCurrentRevision: boolean, revision: number) {
  const now = new Date("2026-07-12T12:00:00.000Z");
  return {
    buyerSnapshot: { name: "Maria" },
    closedAt: now,
    correctionOfSaleId: null,
    createdAt: now,
    deletedAt: null,
    documentPolicySnapshot: {},
    id,
    isCurrentRevision,
    isDeleted: false,
    leadId: null,
    listingSnapshot: {},
    overrideReason: null,
    overrideRequiredFields: false,
    revision,
    salePriceCents: 5000000,
    saleSourceSnapshot: {},
    selectedDocumentKinds: ["sale_contract"],
    sellerUserId: null,
    status: "closed" as const,
    storeId: "store_1",
    tenantId: "tenant_1",
    unitId: "unit_1",
    updatedAt: now,
  };
}

function correctionInput(): CreateSaleCorrectionRevisionInput {
  return {
    buyerSnapshot: { name: "Maria" },
    correctionOfSaleId: "sale_1",
    expectedRevision: 1,
    payments: [
      {
        amountCents: 5000000,
        method: "pix",
        principalCents: 5000000,
      },
    ],
    reason: "Buyer legal name correction",
    saleId: "sale_1",
    salePriceCents: 5000000,
    selectedDocumentKinds: ["sale_contract"],
    unitId: "unit_1",
  };
}

type FakeState = {
  correctionCount: number;
  originalIsCurrentRevision: boolean;
};
