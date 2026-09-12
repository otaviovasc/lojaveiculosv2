import { randomBytes, randomUUID } from "node:crypto";
import type {
  MarketplaceOAuthStateBinding,
  MarketplaceOAuthStateStore,
  MarketplaceOAuthTransaction,
} from "../../../../domains/marketplace/ports/marketplaceOAuthStateStore.js";
import type { MarketplaceTokenSet } from "../../../../domains/marketplace/ports/marketplaceProviderGateway.js";

type StoredTransaction = MarketplaceOAuthTransaction & {
  authorizationCode: string | null;
  exchangeToken: MarketplaceTokenSet | null;
  leaseExpiresAt: Date | null;
  leaseOwner: string | null;
  state: string;
  status: "cancelled" | "consumed" | "exchanging" | "pending" | "received";
};

export function createMemoryMarketplaceOAuthStateStore(input?: {
  createId?: () => string;
  createState?: () => string;
}): MarketplaceOAuthStateStore {
  const transactions = new Map<string, StoredTransaction>();
  const createId = input?.createId ?? randomUUID;
  const createState =
    input?.createState ?? (() => randomBytes(32).toString("base64url"));

  return {
    cancelPending: async ({ binding, state, usedAt }) =>
      transitionByState(state, binding, usedAt, "cancelled"),
    consumePending: async ({ binding, state, usedAt }) =>
      transitionByState(state, binding, usedAt, "consumed"),
    claimReceived: async ({
      binding,
      leaseExpiresAt,
      leaseOwner,
      transactionId,
      usedAt,
    }) => {
      const transaction = transactions.get(transactionId);
      const statusUsable =
        transaction?.status === "received" ||
        (transaction?.status === "exchanging" &&
          transaction.leaseExpiresAt !== null &&
          transaction.leaseExpiresAt <= usedAt);
      if (
        !transaction ||
        !statusUsable ||
        transaction.expiresAt <= usedAt ||
        !Object.entries(binding).every(
          ([key, value]) =>
            value === undefined ||
            transaction[key as keyof MarketplaceOAuthTransaction] === value,
        ) ||
        !transaction.authorizationCode
      ) {
        return null;
      }
      const authorizationCode = transaction.authorizationCode;
      transaction.leaseExpiresAt = leaseExpiresAt;
      transaction.leaseOwner = leaseOwner;
      transaction.status = "exchanging";
      return {
        ...publicTransaction(transaction),
        authorizationCode,
        exchangeToken: transaction.exchangeToken,
      };
    },
    saveExchangeToken: async ({ leaseOwner, token, transactionId }) => {
      const transaction = transactions.get(transactionId);
      if (
        transaction?.status !== "exchanging" ||
        transaction.leaseOwner !== leaseOwner
      )
        return false;
      transaction.exchangeToken = token;
      return true;
    },
    finishExchange: async ({ leaseOwner, succeeded, transactionId }) => {
      const transaction = transactions.get(transactionId);
      if (
        transaction?.status !== "exchanging" ||
        transaction.leaseOwner !== leaseOwner
      )
        return false;
      transaction.leaseExpiresAt = null;
      transaction.leaseOwner = null;
      transaction.status = succeeded ? "consumed" : "received";
      if (succeeded) transaction.authorizationCode = null;
      return true;
    },
    issue: async (transaction) => {
      const stored: StoredTransaction = {
        ...transaction,
        authorizationCode: null,
        createdAt: new Date(),
        id: createId(),
        exchangeToken: null,
        leaseExpiresAt: null,
        leaseOwner: null,
        state: createState(),
        status: "pending",
      };
      transactions.set(stored.id, stored);
      return { ...publicTransaction(stored), state: stored.state };
    },
    receiveCallback: async ({
      authorizationCode,
      binding,
      receivedAt,
      state,
    }) => {
      const transaction = findByState(state);
      if (!isUsable(transaction, binding, receivedAt, "pending")) return null;
      transaction.authorizationCode = authorizationCode;
      transaction.status = "received";
      return publicTransaction(transaction);
    },
  };

  function transitionByState(
    state: string,
    binding: MarketplaceOAuthStateBinding,
    usedAt: Date,
    status: "cancelled" | "consumed",
  ) {
    const transaction = findByState(state);
    if (!isUsable(transaction, binding, usedAt, "pending")) return null;
    transaction.status = status;
    return publicTransaction(transaction);
  }

  function findByState(state: string) {
    return [...transactions.values()].find(
      (transaction) => transaction.state === state,
    );
  }
}

function isUsable(
  transaction: StoredTransaction | undefined,
  binding: MarketplaceOAuthStateBinding,
  usedAt: Date,
  status: StoredTransaction["status"],
): transaction is StoredTransaction {
  return Boolean(
    transaction &&
    transaction.status === status &&
    transaction.expiresAt.getTime() > usedAt.getTime() &&
    Object.entries(binding).every(
      ([key, value]) =>
        value === undefined ||
        transaction[key as keyof MarketplaceOAuthTransaction] === value,
    ),
  );
}

function publicTransaction(
  transaction: StoredTransaction,
): MarketplaceOAuthTransaction {
  return {
    actorId: transaction.actorId,
    createdAt: transaction.createdAt,
    expiresAt: transaction.expiresAt,
    id: transaction.id,
    provider: transaction.provider,
    redirectUri: transaction.redirectUri,
    requestId: transaction.requestId,
    storeId: transaction.storeId,
    tenantId: transaction.tenantId,
  };
}
