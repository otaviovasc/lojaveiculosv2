import { describe, expect, it, vi } from "vitest";
import { createTestDocumentRepository } from "../../../domains/documents/testSupportDocumentRepository.js";
import type { FinanceServicePorts } from "../../../domains/finance/services/FinanceService/serviceSupport.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryObjectStorage } from "../../../infrastructure/storage/memoryObjectStorage.js";
import type { TransactionRunner } from "../../../shared/transaction.js";
import { createMemoryFinanceRepository } from "../../inventory/adapters/memory/financeRepository.js";
import { createFinanceServices } from "./financeServices.js";

describe("finance transaction composition", () => {
  const cases: readonly [
    string,
    (services: ReturnType<typeof createFinanceServices>) => Promise<unknown>,
  ][] = [
    [
      "attachDocument",
      (services) =>
        services.attachDocument(context(), {
          entryId: "finance_entry_1",
          fileName: "receipt.pdf",
          kind: "sale_receipt",
          storageKey: "storage/key.pdf",
          title: "Receipt",
        }),
    ],
    [
      "cancelEntry",
      (services) => services.cancelEntry(context(), { entryId: "entry_1" }),
    ],
    [
      "createCommissionRule",
      (services) =>
        services.createCommissionRule(context(), {
          category: "sale",
          name: "Sales commission",
          percentageBasisPoints: 100,
          sellerUserId: "seller_1",
          status: "active",
          type: "percentage",
        }),
    ],
    ["createEntry", (services) => services.createEntry(context(), entry())],
    [
      "createRecurringEntry",
      (services) =>
        services.createRecurringEntry(context(), {
          amountCents: 1000,
          category: "rent",
          dayOfMonth: 10,
          frequency: "monthly",
          name: "Rent",
          nextDueAt: new Date("2026-07-10T00:00:00.000Z"),
          status: "pending",
          type: "expense",
        }),
    ],
    [
      "payEntry",
      (services) => services.payEntry(context(), { entryId: "entry_1" }),
    ],
    [
      "updateEntry",
      (services) =>
        services.updateEntry(context(), {
          amountCents: 1200,
          entryId: "entry_1",
        }),
    ],
  ];

  it.each(cases)("%s runs inside the transaction runner", async (_, call) => {
    const error = new Error("transaction required");
    const runner: TransactionRunner<FinanceServicePorts> = {
      runInTransaction: vi.fn(async () => {
        throw error;
      }),
    };
    const services = createFinanceServices({
      ports: {
        documentRepository: createTestDocumentRepository(),
        financeRepository: createMemoryFinanceRepository(),
        objectStorage: createMemoryObjectStorage(),
      },
      transactionRunner: runner,
    });

    await expect(call(services)).rejects.toThrow(error);
    expect(runner.runInTransaction).toHaveBeenCalledTimes(1);
  });
});

function context() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    permissions: [
      "finance.attach_document",
      "finance.create",
      "finance.read",
      "finance.update",
    ],
    request: { requestId: "req_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

function entry() {
  return {
    amountCents: 1000,
    category: "Sale",
    links: [],
    metadata: {},
    name: "Sale",
    status: "pending" as const,
    type: "revenue" as const,
  };
}
