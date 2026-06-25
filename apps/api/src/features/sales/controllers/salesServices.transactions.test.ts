import { describe, expect, it, vi } from "vitest";
import type { SalesServicePorts } from "../../../domains/sales/services/SalesService/serviceSupport.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { TransactionRunner } from "../../../shared/transaction.js";
import { createMemorySalesRepository } from "../adapters/memory/salesRepository.js";
import { createSalesServices } from "./salesServices.js";

describe("sales transaction composition", () => {
  const cases: readonly [
    string,
    (services: ReturnType<typeof createSalesServices>) => Promise<unknown>,
  ][] = [
    ["createDraft", (services) => services.createDraft(context(), draft())],
    [
      "transition",
      (services) =>
        services.transition(context(), {
          saleId: "sale_1",
          status: "pending",
        }),
    ],
    [
      "updateDraft",
      (services) => services.updateDraft(context(), "sale_1", draft()),
    ],
  ];

  it.each(cases)("%s runs inside the transaction runner", async (_, call) => {
    const error = new Error("transaction required");
    const runner: TransactionRunner<SalesServicePorts> = {
      runInTransaction: vi.fn(async () => {
        throw error;
      }),
    };
    const services = createSalesServices({
      ports: { salesRepository: createMemorySalesRepository() },
      transactionRunner: runner,
    });

    await expect(call(services)).rejects.toThrow(error);
    expect(runner.runInTransaction).toHaveBeenCalledTimes(1);
  });
});

function context() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions: ["sale.draft", "sale.reserve"],
    request: { requestId: "req_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

function draft() {
  return {
    buyerSnapshot: { name: "Maria" },
    leadId: "lead_1",
  };
}
