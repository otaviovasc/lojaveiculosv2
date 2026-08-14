import type {
  MarketplaceAccountConnectionStatus,
  MarketplaceAccountRequirement,
  MarketplaceCatalogSnapshot,
  MarketplaceListingProjection,
  MarketplaceProvider,
  MarketplaceServiceErrorCode,
  MarketplaceSyncJobType,
} from "./marketplaceRepository.js";

export type { MarketplaceServiceErrorCode };

export type MarketplaceTokenSet = {
  accessToken: string;
  expiresAt: Date | null;
  providerAccountId: string | null;
  refreshToken: string | null;
  scope: string | null;
  tokenType: string | null;
};

export type MarketplaceAuthorizationRequest = {
  redirectUri: string;
  state: string;
};

export type MarketplaceGatewayAuthConfig = {
  clientId: string;
  clientSecret?: string;
};

export type MarketplaceProviderAccountInput = {
  token: MarketplaceTokenSet;
};

export type MarketplaceProviderAccountStatus = {
  accountId: string | null;
  requirements: MarketplaceAccountRequirement[];
  status: MarketplaceAccountConnectionStatus;
};

export type MarketplacePublishInput = {
  externalId?: string | null;
  jobType: MarketplaceSyncJobType;
  listing?: MarketplaceListingProjection;
  metadata: Record<string, unknown>;
  token: MarketplaceTokenSet;
};

export type MarketplacePublishResult = {
  externalId: string | null;
  metadata: Record<string, unknown>;
  operationToken: string | null;
  providerStatus: string;
};

export type MarketplaceListingReconciliationState =
  | "accepted"
  | "deleted"
  | "error"
  | "pending"
  | "queued"
  | "refused"
  | "unknown";

export type MarketplaceListingReconciliationInput = {
  externalId: string;
  jobType: MarketplaceSyncJobType;
  listId: string | null;
  operationToken: string | null;
  token: MarketplaceTokenSet;
};

export type MarketplaceListingReconciliationResult = {
  externalId: string;
  listId: string | null;
  listingUrl: string | null;
  message: string | null;
  providerStatus: string;
  state: MarketplaceListingReconciliationState;
};

export type MarketplaceProviderCatalogResolution = {
  providerBrandCode: string | null;
  providerModelCode: string | null;
  providerTrimCode: string | null;
  providerYearCode: string | null;
  status: "resolved" | "unresolved";
  unresolvedReason: string | null;
};

export type MarketplaceProviderGateway = {
  checkAccount: (
    input: MarketplaceProviderAccountInput,
  ) => Promise<MarketplaceProviderAccountStatus>;
  createAuthorizationUrl: (
    input: MarketplaceAuthorizationRequest,
  ) => Promise<string>;
  exchangeAuthorizationCode: (input: {
    code: string;
    redirectUri: string;
  }) => Promise<MarketplaceTokenSet>;
  provider: MarketplaceProvider;
  refreshToken?: (refreshToken: string) => Promise<MarketplaceTokenSet>;
  reconcileListingSync?: (
    input: MarketplaceListingReconciliationInput,
  ) => Promise<MarketplaceListingReconciliationResult>;
  resolveCatalogMapping?: (input: {
    catalog: MarketplaceCatalogSnapshot;
    token: MarketplaceTokenSet;
  }) => Promise<MarketplaceProviderCatalogResolution>;
  runListingSync: (
    input: MarketplacePublishInput,
  ) => Promise<MarketplacePublishResult>;
};

export type MarketplaceProviderGatewayRegistry = {
  getGateway: (provider: MarketplaceProvider) => MarketplaceProviderGateway;
};
