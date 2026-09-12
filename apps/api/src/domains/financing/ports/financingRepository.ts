import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CompleteFinancingInquiryInput,
  CreateFinancingInquiryInput,
  CreateOAuthTransactionInput,
  FinancingBankCredential,
  FinancingConnection,
  FinancingInquiry,
  FinancingInquiryListItem,
  FinancingOAuthTransaction,
  FinancingProvider,
  FinancingStoreMapping,
  FinancingTokenSet,
  ReserveSimulationOperationInput,
  ReserveSimulationOperationResult,
  RotateFinancingConnectionTokenInput,
  UpsertFinancingConnectionInput,
  UpsertProviderInquiryInput,
  UpsertProviderInquiryResult,
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
  FinancingInquiryListItem,
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
  UpsertProviderInquiryInput,
  UpsertProviderInquiryResult,
} from "./financingModels.js";

export type FinancingInquiryReferenceInput = {
  leadId: string | null;
  listingId: string | null;
  storeId: StoreId;
  tenantId: TenantId;
  unitId: string | null;
};

export type FinancingInquiryReferenceFailure =
  | "lead_not_found"
  | "listing_not_found"
  | "unit_listing_mismatch"
  | "unit_not_found";

export type FinancingVehicleAuthority = {
  assetValueCents: number | null;
  fipeCode: string | null;
  listingId: string;
  manufactureYear: number | null;
  modelYear: number | null;
  zeroKm: boolean;
};

export type FinancingInquiryReferenceValidation =
  | {
      valid: true;
      vehicleAuthority: FinancingVehicleAuthority | null;
    }
  | { reason: FinancingInquiryReferenceFailure; valid: false };

export class FinancingInquiryReferenceError extends Error {
  constructor(readonly reason: FinancingInquiryReferenceFailure) {
    super("Financing inquiry reference validation failed.");
    this.name = "FinancingInquiryReferenceError";
  }
}

export type FinancingRepository = {
  completeInquiry: (
    input: CompleteFinancingInquiryInput,
  ) => Promise<FinancingInquiry>;
  cancelOAuthTransaction: (input: {
    provider: FinancingProvider;
    stateHash: string;
    tenantId?: TenantId;
    usedAt: Date;
  }) => Promise<FinancingOAuthTransaction | null>;
  claimOAuthTransaction: (input: {
    leaseExpiresAt: Date;
    leaseOwner: string;
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
  validateInquiryReferences: (
    input: FinancingInquiryReferenceInput,
  ) => Promise<FinancingInquiryReferenceValidation>;
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
  }) => Promise<FinancingInquiryListItem[]>;
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
  finishOAuthTransaction: (input: {
    leaseOwner: string;
    succeeded: boolean;
    transactionId: string;
    usedAt: Date;
  }) => Promise<boolean>;
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
  ) => Promise<FinancingConnection | null>;
  saveOAuthExchangeToken: (input: {
    leaseOwner: string;
    token: FinancingTokenSet;
    transactionId: string;
  }) => Promise<boolean>;
  upsertConnection: (
    input: UpsertFinancingConnectionInput,
  ) => Promise<FinancingConnection>;
  upsertProviderInquiry: (
    input: UpsertProviderInquiryInput,
  ) => Promise<UpsertProviderInquiryResult>;
  upsertStoreMapping: (input: {
    provider: FinancingProvider;
    providerStoreId: string;
    providerStoreName: string | null;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<FinancingStoreMapping>;
};
