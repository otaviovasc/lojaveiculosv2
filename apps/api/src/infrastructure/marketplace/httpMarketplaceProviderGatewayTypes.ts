import type {
  MarketplaceGatewayAuthConfig,
  MarketplaceServiceErrorCode,
} from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import type { MarketplaceProvider } from "../../domains/marketplace/ports/marketplaceRepository.js";

export type HttpMarketplaceGatewayOptions = {
  auth: MarketplaceGatewayAuthConfig;
  authorizationScope?: string;
  authorizationUrl?: string;
  baseUrl: string;
  fetch?: typeof fetch;
  accountPath?: string;
  listingPath?: string;
  requirementConfig?: ProviderRequirementConfig;
  provider: MarketplaceProvider;
  tokenUrl: string;
};

export type ProviderRequirementConfig = {
  accountCheckPath?: string;
  requirements?: readonly {
    code: MarketplaceServiceErrorCode;
    message: string;
    severity: "blocked" | "ok" | "warning";
    userAction: string;
  }[];
};
