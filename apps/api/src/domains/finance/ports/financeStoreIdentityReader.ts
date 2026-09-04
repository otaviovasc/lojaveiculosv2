export type FinanceStoreIdentity = {
  name: string;
};

export type FinanceStoreIdentityReader = {
  findByStore: (input: {
    storeId: string;
    tenantId: string;
  }) => Promise<FinanceStoreIdentity | null>;
};
