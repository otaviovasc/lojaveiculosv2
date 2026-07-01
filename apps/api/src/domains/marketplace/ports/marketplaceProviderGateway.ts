import type {
  MarketplaceListingProjection,
  MarketplaceProvider,
  MarketplaceSyncJobType,
} from "./marketplaceRepository.js";

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
  providerStatus: string;
};

export type MarketplaceProviderGateway = {
  createAuthorizationUrl: (
    input: MarketplaceAuthorizationRequest,
  ) => Promise<string>;
  exchangeAuthorizationCode: (input: {
    code: string;
    redirectUri: string;
  }) => Promise<MarketplaceTokenSet>;
  provider: MarketplaceProvider;
  refreshToken?: (refreshToken: string) => Promise<MarketplaceTokenSet>;
  runListingSync: (
    input: MarketplacePublishInput,
  ) => Promise<MarketplacePublishResult>;
};

export type MarketplaceProviderGatewayRegistry = {
  getGateway: (provider: MarketplaceProvider) => MarketplaceProviderGateway;
};
