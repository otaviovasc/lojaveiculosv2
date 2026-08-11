import type { MarketplaceProvider } from "./marketplaceRepository.js";
import type { MarketplaceTokenSet } from "./marketplaceProviderGateway.js";

export type MarketplaceOAuthTransaction = {
  actorId: string;
  createdAt: Date;
  expiresAt: Date;
  id: string;
  provider: MarketplaceProvider;
  redirectUri: string;
  requestId: string;
  storeId: string;
  tenantId: string;
};

export type MarketplaceOAuthStateBinding = Partial<
  Pick<
    MarketplaceOAuthTransaction,
    "actorId" | "provider" | "redirectUri" | "storeId" | "tenantId"
  >
>;

export type MarketplaceOAuthStateStore = {
  cancelPending: (input: {
    binding: MarketplaceOAuthStateBinding;
    state: string;
    usedAt: Date;
  }) => Promise<MarketplaceOAuthTransaction | null>;
  consumePending: (input: {
    binding: MarketplaceOAuthStateBinding;
    state: string;
    usedAt: Date;
  }) => Promise<MarketplaceOAuthTransaction | null>;
  claimReceived: (input: {
    binding: MarketplaceOAuthStateBinding;
    leaseExpiresAt: Date;
    leaseOwner: string;
    transactionId: string;
    usedAt: Date;
  }) => Promise<
    | (MarketplaceOAuthTransaction & {
        authorizationCode: string;
        exchangeToken: MarketplaceTokenSet | null;
      })
    | null
  >;
  saveExchangeToken: (input: {
    leaseOwner: string;
    token: MarketplaceTokenSet;
    transactionId: string;
  }) => Promise<boolean>;
  finishExchange: (input: {
    leaseOwner: string;
    succeeded: boolean;
    transactionId: string;
    usedAt: Date;
  }) => Promise<boolean>;
  issue: (
    input: Omit<MarketplaceOAuthTransaction, "createdAt" | "id">,
  ) => Promise<MarketplaceOAuthTransaction & { state: string }>;
  receiveCallback: (input: {
    authorizationCode: string;
    binding: MarketplaceOAuthStateBinding;
    receivedAt: Date;
    state: string;
  }) => Promise<MarketplaceOAuthTransaction | null>;
};
