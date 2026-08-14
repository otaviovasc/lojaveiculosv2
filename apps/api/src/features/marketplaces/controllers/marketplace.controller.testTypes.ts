import type { MarketplaceRepository } from "../../../domains/marketplace/ports/marketplaceRepository.js";
import type { MarketplaceProviderAccountStatus } from "../../../domains/marketplace/ports/marketplaceProviderGateway.js";
import type { MarketplaceServicePorts } from "../../../domains/marketplace/services/MarketplaceService/serviceSupport.js";
import type { createMemoryAuditSink } from "../../../shared/auditSink.js";
import type { createGateway } from "./marketplace.controller.testSupport.js";

export type TestAppOptions = {
  audit?: ReturnType<typeof createMemoryAuditSink>;
  entitlements?: string[];
  gateway?: ReturnType<typeof createGateway>;
  olxCrmOnboarding?: MarketplaceServicePorts["olxCrmOnboarding"];
  permissions?: string[];
  requestId?: string;
  repository?: MarketplaceRepository;
};

export type GatewayOptions = {
  accessToken?: string;
  accountStatus?: MarketplaceProviderAccountStatus;
  failAlwaysFor?: string;
  failOnceFor?: string;
  failTokenExchangeOnce?: boolean;
  rejectOnceFor?: string;
  scope?: string | null;
  submissionStatus?: "active" | "submitted";
};
