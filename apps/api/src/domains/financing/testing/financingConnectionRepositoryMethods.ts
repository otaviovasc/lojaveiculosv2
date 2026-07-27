import type {
  FinancingRepository,
  FinancingStoreMapping,
  RotateFinancingConnectionTokenInput,
} from "../ports/financingRepository.js";
import {
  nextId,
  nextSequence,
  toConnection,
  toOAuthTransaction,
} from "./financingRepositorySupport.js";
import type { MemoryFinancingRepositoryState } from "./financingRepositoryState.js";

type ConnectionMethods = Pick<
  FinancingRepository,
  | "consumeOAuthTransaction"
  | "createOAuthTransaction"
  | "deleteStoreMapping"
  | "disconnectConnection"
  | "findConnection"
  | "findStoreMapping"
  | "findTenantStore"
  | "listStoreMappings"
  | "rotateConnectionToken"
  | "upsertConnection"
  | "upsertStoreMapping"
>;

export function createConnectionRepositoryMethods(
  state: MemoryFinancingRepositoryState,
): ConnectionMethods {
  return {
    async consumeOAuthTransaction(input) {
      const transaction = state.oauthTransactions.find(
        (item) =>
          item.provider === input.provider &&
          item.stateHash === input.stateHash &&
          (!input.tenantId || item.tenantId === input.tenantId) &&
          item.usedAt === null,
      );
      if (!transaction) return null;
      state.oauthTransactions = state.oauthTransactions.map((item) =>
        item.id === transaction.id ? { ...item, usedAt: input.usedAt } : item,
      );
      return { ...transaction, usedAt: input.usedAt };
    },
    async createOAuthTransaction(input) {
      const transaction = toOAuthTransaction(input, nextSequence(state));
      state.oauthTransactions = [transaction, ...state.oauthTransactions];
      return transaction;
    },
    async deleteStoreMapping(input) {
      const before = state.storeMappings.length;
      state.storeMappings = state.storeMappings.filter(
        (item) =>
          !(
            item.provider === input.provider &&
            item.storeId === input.storeId &&
            item.tenantId === input.tenantId
          ),
      );
      return before !== state.storeMappings.length;
    },
    async disconnectConnection(input) {
      const connection = state.connections.find(
        (item) =>
          item.provider === input.provider && item.tenantId === input.tenantId,
      );
      if (!connection) return null;
      const disconnected = {
        ...connection,
        status: "disconnected" as const,
        token: null,
        updatedAt: input.disconnectedAt,
      };
      state.connections = state.connections.map((item) =>
        item.id === connection.id ? disconnected : item,
      );
      return disconnected;
    },
    async findConnection(input) {
      return (
        state.connections.find(
          (item) =>
            item.provider === input.provider &&
            item.tenantId === input.tenantId,
        ) ?? null
      );
    },
    async findStoreMapping(input) {
      return (
        state.storeMappings.find(
          (item) =>
            item.provider === input.provider &&
            item.storeId === input.storeId &&
            item.tenantId === input.tenantId,
        ) ?? null
      );
    },
    async findTenantStore(input) {
      return state.tenantStores.some(
        (item) =>
          item.storeId === input.storeId && item.tenantId === input.tenantId,
      )
        ? { storeId: input.storeId, tenantId: input.tenantId }
        : null;
    },
    async listStoreMappings(input) {
      return state.storeMappings.filter(
        (item) =>
          item.provider === input.provider && item.tenantId === input.tenantId,
      );
    },
    async rotateConnectionToken(input) {
      const connection = findRotatableConnection(state, input);
      if (!connection) throw new Error("Financing token rotation conflict.");
      const rotated = toConnection(
        {
          ...input,
          token: {
            ...input.token,
            refreshToken:
              input.token.refreshToken ?? input.previousRefreshToken,
          },
        },
        connection.id,
        connection.connectedAt,
      );
      state.connections = state.connections.map((item) =>
        item.id === connection.id ? rotated : item,
      );
      return rotated;
    },
    async upsertConnection(input) {
      const existing = state.connections.find(
        (item) =>
          item.provider === input.provider && item.tenantId === input.tenantId,
      );
      const connection = toConnection(
        input,
        existing?.id ?? nextId(state, "financing_connection"),
        existing?.connectedAt ?? new Date(),
      );
      state.connections = [
        ...state.connections.filter((item) => item.id !== connection.id),
        connection,
      ];
      return connection;
    },
    async upsertStoreMapping(input) {
      const existing = state.storeMappings.find(
        (item) =>
          item.provider === input.provider &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
      );
      const mapping = toStoreMapping(input, existing, state);
      state.storeMappings = [
        ...state.storeMappings.filter((item) => item.id !== mapping.id),
        mapping,
      ];
      return mapping;
    },
  };
}

function findRotatableConnection(
  state: MemoryFinancingRepositoryState,
  input: RotateFinancingConnectionTokenInput,
) {
  return state.connections.find(
    (item) =>
      item.id === input.connectionId &&
      item.provider === input.provider &&
      item.tenantId === input.tenantId &&
      item.token?.refreshToken === input.previousRefreshToken,
  );
}

function toStoreMapping(
  input: Parameters<FinancingRepository["upsertStoreMapping"]>[0],
  existing: FinancingStoreMapping | undefined,
  state: MemoryFinancingRepositoryState,
): FinancingStoreMapping {
  const now = new Date();
  return {
    createdAt: existing?.createdAt ?? now,
    id: existing?.id ?? nextId(state, "financing_mapping"),
    provider: input.provider,
    providerStoreId: input.providerStoreId,
    providerStoreName: input.providerStoreName,
    storeId: input.storeId,
    tenantId: input.tenantId,
    updatedAt: now,
  };
}
