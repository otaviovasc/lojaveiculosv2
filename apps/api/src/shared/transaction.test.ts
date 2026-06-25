import { describe, expect, it } from "vitest";
import {
  createClientTransactionRunner,
  createPassthroughTransactionRunner,
} from "./transaction.js";

describe("transaction runner", () => {
  it("passes existing ports through when no transactional adapter exists", async () => {
    const ports = { name: "memory" };
    const runner = createPassthroughTransactionRunner(ports);

    await expect(
      runner.runInTransaction(async (transactionPorts) => transactionPorts),
    ).resolves.toBe(ports);
  });

  it("rebuilds ports from a transaction client", async () => {
    let transactionCalls = 0;
    const client = {
      async transaction<TResult>(
        operation: (transactionClient: unknown) => Promise<TResult>,
      ): Promise<TResult> {
        transactionCalls += 1;
        return operation({ name: "tx" });
      },
    };
    const runner = createClientTransactionRunner(
      client,
      (transactionClient) => ({
        clientName: (transactionClient as { name: string }).name,
      }),
    );

    await expect(
      runner.runInTransaction(async (ports) => ports.clientName),
    ).resolves.toBe("tx");
    expect(transactionCalls).toBe(1);
  });
});
