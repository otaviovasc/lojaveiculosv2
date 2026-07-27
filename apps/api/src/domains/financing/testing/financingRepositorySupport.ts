import type {
  CreateOAuthTransactionInput,
  FinancingCondition,
  FinancingConnection,
  FinancingInquiry,
  FinancingOAuthTransaction,
  FinancingProvider,
  FinancingSimulationStatus,
  FinancingStoreMapping,
  UpsertFinancingConnectionInput,
} from "../ports/financingRepository.js";
import {
  nextId,
  nextSequence,
  type MemoryFinancingRepositoryState,
} from "./financingRepositoryState.js";

export function toConnection(
  input: UpsertFinancingConnectionInput,
  id: string,
  connectedAt: Date | null,
): FinancingConnection {
  return {
    connectedAt,
    id,
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    status: input.status,
    tenantId: input.tenantId,
    token: input.token,
    updatedAt: new Date(),
  };
}

export function toOAuthTransaction(
  input: CreateOAuthTransactionInput,
  sequence: number,
): FinancingOAuthTransaction {
  return {
    codeVerifier: input.codeVerifier,
    createdAt: new Date(),
    expiresAt: input.expiresAt,
    id: `financing_oauth_${sequence}`,
    provider: input.provider,
    redirectUri: input.redirectUri,
    requestedByUserId: input.requestedByUserId ?? null,
    stateHash: input.stateHash,
    tenantId: input.tenantId,
    usedAt: null,
  };
}

export function requireInquiry(
  inquiries: readonly FinancingInquiry[],
  input: { inquiryId: string; storeId: string; tenantId: string },
): FinancingInquiry {
  const inquiry = inquiries.find(
    (item) =>
      item.id === input.inquiryId &&
      item.storeId === input.storeId &&
      item.tenantId === input.tenantId,
  );
  if (!inquiry) throw new Error("Memory financing inquiry was not found.");
  return inquiry;
}

export function updateInquiryStatus(
  state: MemoryFinancingRepositoryState,
  input: { inquiryId: string; storeId: string; tenantId: string },
  status: FinancingSimulationStatus,
  metadata: Record<string, unknown>,
): FinancingInquiry {
  const inquiry = requireInquiry(state.inquiries, input);
  const updated = {
    ...inquiry,
    metadata: { ...inquiry.metadata, ...metadata },
    providerInquiryId:
      typeof metadata.providerInquiryId === "string"
        ? metadata.providerInquiryId
        : inquiry.providerInquiryId,
    reason:
      typeof metadata.reason === "string"
        ? metadata.reason
        : typeof metadata.errorMessage === "string"
          ? metadata.errorMessage
          : inquiry.reason,
    status,
    success: status === "failed" ? false : inquiry.success,
    updatedAt: new Date(),
  };
  state.inquiries.splice(
    state.inquiries.findIndex((item) => item.id === inquiry.id),
    1,
    updated,
  );
  return updated;
}

export function toCondition(
  input: Omit<FinancingCondition, "id" | "inquiryId">,
  inquiryId: string,
): FinancingCondition {
  return {
    ...input,
    id: `financing_condition_${Math.random().toString(36).slice(2)}`,
    inquiryId,
  };
}

export function seedConnection(
  state: MemoryFinancingRepositoryState,
  input: Partial<FinancingConnection> = {},
): FinancingConnection {
  const connection = {
    ...toConnection(
      {
        provider: "credere" as FinancingProvider,
        providerAccountId: "provider_account_1",
        status: "connected",
        tenantId: "tenant_1" as never,
        token: {
          accessToken: "access_token_1",
          expiresAt: null,
          providerAccountId: "provider_account_1",
          refreshToken: "refresh_token_1",
          scope: "simulator proposals",
          tokenType: "Bearer",
        },
      },
      nextId(state, "financing_connection"),
      new Date(),
    ),
    ...input,
  };
  state.connections = [
    ...state.connections.filter(
      (item) =>
        !(
          item.provider === connection.provider &&
          item.tenantId === connection.tenantId
        ),
    ),
    connection,
  ];
  return connection;
}

export function seedStoreMapping(
  state: MemoryFinancingRepositoryState,
  input: Partial<FinancingStoreMapping> = {},
): FinancingStoreMapping {
  const now = new Date();
  const mapping: FinancingStoreMapping = {
    createdAt: now,
    id: nextId(state, "financing_mapping"),
    provider: "credere",
    providerStoreId: state.providerStores[0]?.id ?? "credere_store_1",
    providerStoreName: state.providerStores[0]?.name ?? "Credere Matriz",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
    updatedAt: now,
    ...input,
  };
  state.storeMappings = [
    ...state.storeMappings.filter(
      (item) =>
        !(
          item.provider === mapping.provider &&
          item.storeId === mapping.storeId &&
          item.tenantId === mapping.tenantId
        ),
    ),
    mapping,
  ];
  return mapping;
}

export { nextId, nextSequence };
