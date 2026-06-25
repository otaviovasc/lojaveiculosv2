export type TransactionRunner<TPorts> = {
  runInTransaction<TResult>(
    operation: (ports: TPorts) => Promise<TResult>,
  ): Promise<TResult>;
};

export type TransactionCapableClient = {
  transaction<TResult>(
    operation: (transactionClient: unknown) => Promise<TResult>,
  ): Promise<TResult>;
};

export function createPassthroughTransactionRunner<TPorts>(
  ports: TPorts,
): TransactionRunner<TPorts> {
  return {
    runInTransaction: (operation) => operation(ports),
  };
}

export function createClientTransactionRunner<TPorts, TClient>(
  client: TransactionCapableClient,
  createPorts: (client: TClient) => TPorts,
): TransactionRunner<TPorts> {
  return {
    runInTransaction: (operation) =>
      client.transaction((transactionClient) =>
        operation(createPorts(transactionClient as TClient)),
      ),
  };
}
