import { describe, expect, it, vi } from "vitest";
import { createRuntimeCrmFinancialProductTransactionRunner } from "./runtimeCrmFinancialProductTransaction.js";

describe("runtime CRM financial-product transaction", () => {
  it("binds CRM and finance services to one database transaction client", async () => {
    const transactionClient = {};
    const transaction = vi.fn(
      async (operation: (client: unknown) => Promise<unknown>) =>
        operation(transactionClient),
    );
    const runner = createRuntimeCrmFinancialProductTransactionRunner(
      { transaction },
      {},
    );

    await expect(
      runner.runInTransaction(async (ports) => {
        expect(ports.createActivity).toBeTypeOf("function");
        expect(ports.materializeAutoEntries).toBeTypeOf("function");
        return "committed";
      }),
    ).resolves.toBe("committed");
    expect(transaction).toHaveBeenCalledOnce();
  });
});
