import type { FinancingRepository } from "../ports/financingRepository.js";
import {
  nextSequence,
  toOAuthTransaction,
} from "./financingRepositorySupport.js";
import type { MemoryFinancingRepositoryState } from "./financingRepositoryState.js";

type OAuthMethods = Pick<
  FinancingRepository,
  | "cancelOAuthTransaction"
  | "claimOAuthTransaction"
  | "createOAuthTransaction"
  | "finishOAuthTransaction"
  | "saveOAuthExchangeToken"
>;

export function createOAuthRepositoryMethods(
  state: MemoryFinancingRepositoryState,
): OAuthMethods {
  return {
    async cancelOAuthTransaction(input) {
      const transaction = state.oauthTransactions.find(
        (item) =>
          item.provider === input.provider &&
          item.stateHash === input.stateHash &&
          (!input.tenantId || item.tenantId === input.tenantId) &&
          item.status === "pending" &&
          item.exchangeLeaseOwner === null &&
          item.usedAt === null &&
          item.expiresAt.getTime() > input.usedAt.getTime(),
      );
      if (!transaction) return null;
      state.oauthTransactions = state.oauthTransactions.map((item) =>
        item.id === transaction.id
          ? { ...item, status: "cancelled" as const }
          : item,
      );
      return { ...transaction, status: "cancelled" as const };
    },
    async claimOAuthTransaction(input) {
      const transaction = state.oauthTransactions.find(
        (item) =>
          item.provider === input.provider &&
          item.stateHash === input.stateHash &&
          (!input.tenantId || item.tenantId === input.tenantId) &&
          item.usedAt === null &&
          item.expiresAt.getTime() > input.usedAt.getTime() &&
          item.status === "pending" &&
          (item.exchangeLeaseExpiresAt === null ||
            item.exchangeLeaseExpiresAt.getTime() <= input.usedAt.getTime()),
      );
      if (!transaction) return null;
      const claimed = {
        ...transaction,
        exchangeLeaseExpiresAt: input.leaseExpiresAt,
        exchangeLeaseOwner: input.leaseOwner,
      };
      state.oauthTransactions = state.oauthTransactions.map((item) =>
        item.id === transaction.id ? claimed : item,
      );
      return claimed;
    },
    async createOAuthTransaction(input) {
      const transaction = toOAuthTransaction(input, nextSequence(state));
      state.oauthTransactions = [transaction, ...state.oauthTransactions];
      return transaction;
    },
    async finishOAuthTransaction(input) {
      const transaction = state.oauthTransactions.find(
        (item) =>
          item.id === input.transactionId &&
          item.status === "pending" &&
          item.exchangeLeaseOwner === input.leaseOwner,
      );
      if (!transaction) return false;
      state.oauthTransactions = state.oauthTransactions.map((item) =>
        item.id === transaction.id
          ? {
              ...item,
              exchangeLeaseExpiresAt: null,
              exchangeLeaseOwner: null,
              exchangeToken: input.succeeded ? null : item.exchangeToken,
              status: input.succeeded ? "consumed" : "pending",
              usedAt: input.succeeded ? input.usedAt : null,
            }
          : item,
      );
      return true;
    },
    async saveOAuthExchangeToken(input) {
      const transaction = state.oauthTransactions.find(
        (item) =>
          item.id === input.transactionId &&
          item.status === "pending" &&
          item.exchangeLeaseOwner === input.leaseOwner,
      );
      if (!transaction) return false;
      state.oauthTransactions = state.oauthTransactions.map((item) =>
        item.id === transaction.id
          ? { ...item, exchangeToken: input.token }
          : item,
      );
      return true;
    },
  };
}
