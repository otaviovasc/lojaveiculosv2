import type {
  FinancingBankCredential,
  FinancingConnection,
  FinancingInquiry,
  FinancingOAuthTransaction,
  FinancingProviderStore,
  FinancingRepository,
  FinancingStoreMapping,
} from "../ports/financingRepository.js";

export type MemoryOperation = {
  id: string;
  idempotencyKey: string;
  inquiryId: string | null;
  requestFingerprint: string;
  storeId: string;
  tenantId: string;
};

export type MemoryFinancingRepositoryOptions = {
  bankCredentials?: readonly (FinancingBankCredential & {
    providerStoreId?: string;
    storeId?: string;
    tenantId?: string;
  })[];
  bankPolicy?: readonly string[] | null;
  providerStores?: readonly FinancingProviderStore[];
  tenantStores?: readonly { storeId: string; tenantId: string }[];
};

export type MemoryFinancingRepositoryState = {
  bankCredentials: (FinancingBankCredential & {
    providerStoreId?: string;
    storeId?: string;
    tenantId?: string;
  })[];
  bankPolicy: readonly string[] | null | undefined;
  connections: FinancingConnection[];
  inquiries: FinancingInquiry[];
  oauthTransactions: FinancingOAuthTransaction[];
  operations: MemoryOperation[];
  providerStores: FinancingProviderStore[];
  sequence: number;
  storeMappings: FinancingStoreMapping[];
  tenantStores: { storeId: string; tenantId: string }[];
};

export type MemoryFinancingRepository = FinancingRepository & {
  inspect: () => {
    connections: readonly FinancingConnection[];
    inquiries: readonly FinancingInquiry[];
    oauthTransactions: readonly FinancingOAuthTransaction[];
    operations: readonly MemoryOperation[];
    storeMappings: readonly FinancingStoreMapping[];
  };
  seedConnection: (input?: Partial<FinancingConnection>) => FinancingConnection;
  seedStoreMapping: (
    input?: Partial<FinancingStoreMapping>,
  ) => FinancingStoreMapping;
};

export function createMemoryFinancingRepositoryState(
  options: MemoryFinancingRepositoryOptions,
): MemoryFinancingRepositoryState {
  return {
    bankCredentials: [
      ...(options.bankCredentials ?? [
        { code: "655", name: "BV" },
        { code: "623", name: "PAN" },
      ]),
    ],
    bankPolicy: options.bankPolicy,
    connections: [],
    inquiries: [],
    oauthTransactions: [],
    operations: [],
    providerStores: [
      ...(options.providerStores ?? [
        {
          documentLast4: "0001",
          id: "credere_store_1",
          name: "Credere Matriz",
          status: "active" as const,
        },
      ]),
    ],
    sequence: 1,
    storeMappings: [],
    tenantStores: [
      ...(options.tenantStores ?? [
        { storeId: "store_1", tenantId: "tenant_1" },
        { storeId: "store_2", tenantId: "tenant_1" },
      ]),
    ],
  };
}

export function nextId(
  state: MemoryFinancingRepositoryState,
  prefix: string,
): string {
  return `${prefix}_${state.sequence++}`;
}

export function nextSequence(state: MemoryFinancingRepositoryState): number {
  return state.sequence++;
}
