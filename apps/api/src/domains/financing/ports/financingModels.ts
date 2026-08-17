import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  FinancingProvider,
  FinancingTokenSet,
} from "./financingProviderGateway.js";
export type { FinancingProvider, FinancingTokenSet };

export type FinancingConnectionStatus =
  "connected" | "disconnected" | "error" | "refresh_required";

export type FinancingSimulationStatus =
  "completed" | "failed" | "indeterminate" | "requested" | "submitted";

export type FinancingConnection = {
  connectedAt: Date | null;
  id: string;
  provider: FinancingProvider;
  providerAccountId: string | null;
  status: FinancingConnectionStatus;
  tenantId: TenantId;
  token: FinancingTokenSet | null;
  updatedAt: Date;
};

export type FinancingOAuthTransaction = {
  codeVerifier: string | null;
  createdAt: Date;
  exchangeLeaseExpiresAt: Date | null;
  exchangeLeaseOwner: string | null;
  exchangeToken: FinancingTokenSet | null;
  expiresAt: Date;
  id: string;
  provider: FinancingProvider;
  redirectUri: string;
  requestedByUserId?: string | null;
  stateHash: string;
  status: "cancelled" | "consumed" | "expired" | "failed" | "pending";
  tenantId: TenantId;
  usedAt: Date | null;
};

export type FinancingProviderStore = {
  documentLast4: string | null;
  id: string;
  name: string;
  status: "active" | "inactive" | "pending" | "unknown";
};

export type FinancingStoreMapping = {
  createdAt: Date;
  id: string;
  provider: FinancingProvider;
  providerStoreId: string;
  providerStoreName: string | null;
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date;
};

export type FinancingBankCredential = {
  code: string;
  name: string | null;
};

export type FinancingConsentEvidence = {
  acceptedAt: Date;
  ipAddress: string | null;
  termsVersion: string;
  userAgent: string | null;
};

export type FinancingCondition = {
  bankCode: string | null;
  bankName: string;
  id: string;
  inquiryId: string;
  installments: number;
  metadata: Record<string, unknown>;
  status: string;
  summary: string | null;
  totalAmountCents: number | null;
};

export type FinancingInquiry = {
  amountCents: number | null;
  bankCodes: readonly string[];
  completedAt: Date | null;
  conditions: readonly FinancingCondition[];
  consentEvidence: FinancingConsentEvidence | null;
  createdAt: Date;
  customerDocumentHash: string;
  customerDocumentLast4: string;
  downPaymentCents: number | null;
  id: string;
  idempotencyKey: string;
  installments: number | null;
  leadId: string | null;
  listingId: string | null;
  metadata: Record<string, unknown>;
  operationId: string;
  provider: FinancingProvider;
  providerInquiryId: string | null;
  providerRequestId: string | null;
  providerStoreId: string;
  reason: string | null;
  requestedByUserId?: string | null;
  status: FinancingSimulationStatus;
  storeId: StoreId;
  success: boolean | null;
  tenantId: TenantId;
  unitId: string | null;
  updatedAt: Date;
};

export type CreateOAuthTransactionInput = {
  codeVerifier: string | null;
  expiresAt: Date;
  provider: FinancingProvider;
  redirectUri: string;
  requestedByUserId?: string | null;
  stateHash: string;
  tenantId: TenantId;
};

export type UpsertFinancingConnectionInput = {
  provider: FinancingProvider;
  providerAccountId: string | null;
  status: FinancingConnectionStatus;
  tenantId: TenantId;
  token: FinancingTokenSet;
};

export type RotateFinancingConnectionTokenInput =
  UpsertFinancingConnectionInput & {
    connectionId: string;
    previousRefreshToken: string | null;
  };

export type ReserveSimulationOperationInput = {
  idempotencyKey: string;
  leaseExpiresAt: Date;
  requestFingerprint: string;
  reservedAt: Date;
  storeId: StoreId;
  tenantId: TenantId;
};

export type ReserveSimulationOperationResult =
  | { kind: "created"; operationId: string }
  | { kind: "recovered"; operationId: string }
  | { inquiryId: string | null; kind: "duplicate"; operationId: string }
  | { kind: "conflict"; operationId: string; requestFingerprint: string };

export type CreateFinancingInquiryInput = {
  amountCents: number;
  bankCodes: readonly string[];
  consentEvidence: FinancingConsentEvidence;
  customerDocumentHash: string;
  customerDocumentLast4: string;
  downPaymentCents: number;
  idempotencyKey: string;
  installments: number;
  leadId: string | null;
  listingId: string | null;
  metadata: Record<string, unknown>;
  operationId: string;
  provider: FinancingProvider;
  providerStoreId: string;
  requestedByUserId?: string | null;
  storeId: StoreId;
  storeMappingId: string;
  tenantId: TenantId;
  unitId: string | null;
};

export type UpsertProviderInquiryInput = {
  amountCents: number | null;
  bankCodes: readonly string[];
  completedAt: Date | null;
  conditions: readonly Omit<FinancingCondition, "id" | "inquiryId">[];
  createdAt: Date;
  customerDocumentHash: string;
  customerDocumentLast4: string | null;
  downPaymentCents: number | null;
  installments: number | null;
  metadata: Record<string, unknown>;
  provider: FinancingProvider;
  providerInquiryId: string;
  providerRequestId: string | null;
  providerStoreId: string;
  reason: string | null;
  status: Extract<
    FinancingSimulationStatus,
    "completed" | "failed" | "submitted"
  >;
  storeId: StoreId;
  storeMappingId: string;
  success: boolean | null;
  tenantId: TenantId;
};

export type UpsertProviderInquiryResult = {
  created: boolean;
  inquiry: FinancingInquiry;
};

export type CompleteFinancingInquiryInput = {
  completedAt: Date;
  conditions: readonly Omit<FinancingCondition, "id" | "inquiryId">[];
  inquiryId: string;
  providerInquiryId: string | null;
  providerRequestId: string | null;
  reason: string | null;
  status: Extract<
    FinancingSimulationStatus,
    "completed" | "failed" | "submitted"
  >;
  storeId: StoreId;
  success: boolean | null;
  tenantId: TenantId;
};
