import type {
  FinancingBankCredential,
  FinancingCondition,
  FinancingConnection,
  FinancingInquiry,
  FinancingOAuthTransaction,
  FinancingStoreMapping,
  FinancingTokenSet,
} from "../../../domains/financing/ports/financingRepository.js";
import type { CredereCredentialCodec } from "../../financing/credereCredentialCodec.js";

export type TokenRow = {
  encryptedToken: string;
  expiresAt: Date | null;
  kind: "access_token" | "refresh_token" | "id_token";
  metadata: unknown;
};

export function toConnection(
  account: {
    connectedAt: Date | null;
    externalAccountId: string | null;
    id: string;
    status: string;
    tenantId: string;
    updatedAt: Date;
  },
  tokens: readonly TokenRow[],
  codec: CredereCredentialCodec,
): FinancingConnection {
  return {
    connectedAt: account.connectedAt,
    id: account.id,
    provider: "credere",
    providerAccountId: account.externalAccountId,
    status: account.status === "active" ? "connected" : "disconnected",
    tenantId: account.tenantId as never,
    token: toTokenSet(tokens, account.externalAccountId, codec),
    updatedAt: account.updatedAt,
  };
}

export function toOAuthTransaction(
  row: {
    codeVerifierCiphertext: string | null;
    createdAt: Date;
    expiresAt: Date;
    id: string;
    provider: "credere";
    redirectUriHash: string;
    requestedByUserId: string | null;
    stateHash: string;
    tenantId: string;
    consumedAt: Date | null;
  },
  codec: CredereCredentialCodec,
  redirectUri: string,
): FinancingOAuthTransaction {
  return {
    codeVerifier: row.codeVerifierCiphertext
      ? codec.decrypt(row.codeVerifierCiphertext)
      : null,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    id: row.id,
    provider: row.provider,
    redirectUri,
    requestedByUserId: row.requestedByUserId,
    stateHash: row.stateHash,
    tenantId: row.tenantId as never,
    usedAt: row.consumedAt,
  };
}

export function toStoreMapping(row: {
  createdAt: Date;
  externalStoreId: string;
  id: string;
  metadata: unknown;
  storeId: string;
  tenantId: string;
  updatedAt: Date;
}): FinancingStoreMapping {
  const metadata = toRecord(row.metadata);
  return {
    createdAt: row.createdAt,
    id: row.id,
    provider: "credere",
    providerStoreId: row.externalStoreId,
    providerStoreName:
      typeof metadata.providerStoreName === "string"
        ? metadata.providerStoreName
        : null,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    updatedAt: row.updatedAt,
  };
}

export function toBank(row: {
  bankFebrabanCode: string;
  bankName: string | null;
}): FinancingBankCredential {
  return { code: row.bankFebrabanCode, name: row.bankName };
}

export function toInquiry(
  row: {
    applicantDocumentHash: string | null;
    applicantDocumentLast4: string | null;
    completedAt: Date | null;
    createdAt: Date;
    id: string;
    idempotencyKey: string | null;
    leadId: string | null;
    listingId: string | null;
    metadata: unknown;
    operationRequestId: string | null;
    providerInquiryId: string | null;
    providerOperationId: string | null;
    providerResultSummary: unknown;
    status: string;
    storeId: string;
    tenantId: string;
    unitId: string | null;
    updatedAt: Date;
  },
  conditions: readonly FinancingCondition[],
): FinancingInquiry {
  const metadata = toRecord(row.metadata);
  const providerResult = toRecord(row.providerResultSummary);
  return {
    amountCents: toNumber(metadata.amountCents),
    bankCodes: readStringArray(metadata.bankCodes),
    completedAt: row.completedAt,
    conditions,
    consentEvidence: {
      acceptedAt: row.createdAt,
      ipAddress: null,
      termsVersion: "persisted",
      userAgent: null,
    },
    createdAt: row.createdAt,
    customerDocumentHash: row.applicantDocumentHash ?? "",
    customerDocumentLast4: row.applicantDocumentLast4 ?? "",
    downPaymentCents: toNumber(metadata.downPaymentCents),
    id: row.id,
    idempotencyKey: row.idempotencyKey ?? "",
    installments: toNumber(metadata.installments),
    leadId: row.leadId,
    listingId: row.listingId,
    metadata,
    operationId: row.operationRequestId ?? "",
    provider: "credere",
    providerInquiryId: row.providerInquiryId,
    providerRequestId: row.providerOperationId,
    providerStoreId: String(metadata.providerStoreId ?? ""),
    reason:
      typeof providerResult.reason === "string" ? providerResult.reason : null,
    status: row.status as FinancingInquiry["status"],
    storeId: row.storeId as never,
    success:
      typeof providerResult.success === "boolean"
        ? providerResult.success
        : null,
    tenantId: row.tenantId as never,
    unitId: row.unitId,
    updatedAt: row.updatedAt,
  };
}

export function toCondition(row: {
  bankFebrabanCode: string | null;
  bankName: string;
  id: string;
  inquiryId: string;
  installments: number;
  metadata: unknown;
  status: string;
  summary: string | null;
  totalAmountCents: number | null;
}): FinancingCondition {
  return {
    bankCode: row.bankFebrabanCode,
    bankName: row.bankName,
    id: row.id,
    inquiryId: row.inquiryId,
    installments: row.installments,
    metadata: toRecord(row.metadata),
    status: row.status,
    summary: row.summary,
    totalAmountCents: row.totalAmountCents,
  };
}

function toTokenSet(
  tokens: readonly TokenRow[],
  providerAccountId: string | null,
  codec: CredereCredentialCodec,
): FinancingTokenSet | null {
  const access = tokens.find((token) => token.kind === "access_token");
  if (!access) return null;
  const refresh = tokens.find((token) => token.kind === "refresh_token");
  const metadata = toRecord(access.metadata);
  return {
    accessToken: codec.decrypt(access.encryptedToken),
    expiresAt: access.expiresAt,
    providerAccountId,
    refreshToken: refresh ? codec.decrypt(refresh.encryptedToken) : null,
    scope: typeof metadata.scope === "string" ? metadata.scope : null,
    tokenType:
      typeof metadata.tokenType === "string" ? metadata.tokenType : null,
  };
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
