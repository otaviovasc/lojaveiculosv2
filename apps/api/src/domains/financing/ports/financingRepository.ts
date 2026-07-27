import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CompleteFinancingInquiryInput,
  CreateFinancingInquiryInput,
  CreateOAuthTransactionInput,
  FinancingBankCredential,
  FinancingConnection,
  FinancingInquiry,
  FinancingOAuthTransaction,
  FinancingProvider,
  FinancingStoreMapping,
  ReserveSimulationOperationInput,
  ReserveSimulationOperationResult,
  RotateFinancingConnectionTokenInput,
  UpsertFinancingConnectionInput,
} from "./financingModels.js";

export type {
  CompleteFinancingInquiryInput,
  CreateFinancingInquiryInput,
  CreateOAuthTransactionInput,
  FinancingBankCredential,
  FinancingCondition,
  FinancingConnection,
  FinancingConnectionStatus,
  FinancingConsentEvidence,
  FinancingInquiry,
  FinancingOAuthTransaction,
  FinancingProvider,
  FinancingProviderStore,
  FinancingSimulationStatus,
  FinancingStoreMapping,
  FinancingTokenSet,
  ReserveSimulationOperationInput,
  ReserveSimulationOperationResult,
  RotateFinancingConnectionTokenInput,
  UpsertFinancingConnectionInput,
} from "./financingModels.js";

export type FinancingRepository = {
  completeInquiry: (
    input: CompleteFinancingInquiryInput,
  ) => Promise<FinancingInquiry>;
  consumeOAuthTransaction: (input: {
    provider: FinancingProvider;
    stateHash: string;
    tenantId?: TenantId;
    usedAt: Date;
  }) => Promise<FinancingOAuthTransaction | null>;
  createInquiry: (
    input: CreateFinancingInquiryInput,
  ) => Promise<FinancingInquiry>;
  createOAuthTransaction: (
    input: CreateOAuthTransactionInput,
  ) => Promise<FinancingOAuthTransaction>;
  deleteStoreMapping: (input: {
    provider: FinancingProvider;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<boolean>;
  disconnectConnection: (input: {
    disconnectedAt: Date;
    provider: FinancingProvider;
    tenantId: TenantId;
  }) => Promise<FinancingConnection | null>;
  failInquiry: (input: {
    errorCode: string;
    errorMessage: string;
    inquiryId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<FinancingInquiry>;
  findConnection: (input: {
    provider: FinancingProvider;
    tenantId: TenantId;
  }) => Promise<FinancingConnection | null>;
  findInquiryById: (input: {
    inquiryId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<FinancingInquiry | null>;
  findStoreMapping: (input: {
    provider: FinancingProvider;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<FinancingStoreMapping | null>;
  findTenantStore: (input: {
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<{ storeId: StoreId; tenantId: TenantId } | null>;
  listActiveOkayBankCredentials: (input: {
    provider: FinancingProvider;
    providerStoreId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<FinancingBankCredential[]>;
  listInquiries: (input: {
    limit?: number;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<FinancingInquiry[]>;
  listStoreMappings: (input: {
    provider: FinancingProvider;
    tenantId: TenantId;
  }) => Promise<FinancingStoreMapping[]>;
  markInquiryIndeterminate: (input: {
    inquiryId: string;
    providerInquiryId: string | null;
    reason: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<FinancingInquiry>;
  readStoreBankPolicy: (input: {
    provider: FinancingProvider;
    providerStoreId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<readonly string[] | null>;
  reserveSimulationOperation: (
    input: ReserveSimulationOperationInput,
  ) => Promise<ReserveSimulationOperationResult>;
  rotateConnectionToken: (
    input: RotateFinancingConnectionTokenInput,
  ) => Promise<FinancingConnection>;
  upsertConnection: (
    input: UpsertFinancingConnectionInput,
  ) => Promise<FinancingConnection>;
  upsertStoreMapping: (input: {
    provider: FinancingProvider;
    providerStoreId: string;
    providerStoreName: string | null;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<FinancingStoreMapping>;
};
