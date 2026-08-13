import { Hono } from "hono";
import { createMemoryAuditSink } from "../../../shared/auditSink.js";
import {
  createNoopServiceLogger,
  createServiceContext,
} from "../../../shared/serviceContext.js";
import type { MarketplaceRepository } from "../../../domains/marketplace/ports/marketplaceRepository.js";
import type {
  MarketplaceProviderAccountStatus,
  MarketplaceProviderGateway,
  MarketplacePublishInput,
} from "../../../domains/marketplace/ports/marketplaceProviderGateway.js";
import {
  createResolvedMarketplaceCatalogMapping,
  createTestMarketplaceRepository,
} from "../../../domains/marketplace/testSupportMarketplaceRepository.js";
import { createMarketplaceFeature } from "./marketplace.controller.js";
import { createMarketplaceOAuthCallbackFeature } from "./marketplace.oauth.controller.js";
import { createMarketplaceServices } from "./marketplaceServices.js";
import { createMemoryMarketplaceOAuthStateStore } from "../adapters/memory/marketplaceOAuthStateStore.js";
import type { MarketplaceServicePorts } from "../../../domains/marketplace/services/MarketplaceService/serviceSupport.js";

export function createTestApp(options: TestAppOptions = {}) {
  const app = new Hono();
  const repository = resolvedRepository(
    options.repository ?? createTestMarketplaceRepository(),
  );
  const gateway = options.gateway ?? createGateway();
  const oauthStateStore = createMemoryMarketplaceOAuthStateStore();
  const services = createMarketplaceServices({
    ports: {
      gatewayRegistry: { getGateway: () => gateway },
      marketplaceRepository: repository,
      olxCrmOnboarding: options.olxCrmOnboarding ?? {
        onboard: async () => ({
          capabilities: {
            chat: {
              capability: "messaging",
              grantState: "granted",
              reason: null,
              status: "active",
            },
            leads: {
              capability: "lead_ingestion",
              grantState: "granted",
              reason: null,
              status: "active",
            },
          },
          connectionId: "olx_connection_1",
          status: "active",
        }),
      },
      oauthRedirectUri: (provider) =>
        provider === "olx"
          ? "http://localhost:5173/api/v1/marketplaces/oauth/olx/callback"
          : "http://localhost:5173/marketplaces/oauth/callback",
      oauthStateStore,
    },
  });
  const contextFactory = async () =>
    Object.assign(
      createServiceContext({
        actor: { id: "user_1", kind: "user" },
        audit: options.audit ?? createMemoryAuditSink(),
        logger: createNoopServiceLogger(),
        permissions: options.permissions ?? [
          "marketplace.inventory_sync",
          "marketplace.listing_publish",
          "marketplace.listing_unpublish",
          "marketplace.listing_update",
          "marketplace.manage",
          "marketplace.read",
          "crm.messaging.connection.setup",
        ],
        request: { requestId: options.requestId ?? "request_1" },
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
      { entitlements: options.entitlements ?? ["marketplace", "crm"] },
    );
  app.route(
    "/api/v1/marketplaces",
    createMarketplaceFeature({
      contextFactory,
      services,
    }),
  );
  app.route(
    "/api/v1/marketplaces/oauth/olx",
    createMarketplaceOAuthCallbackFeature({
      callbackContextFactory: contextFactory,
      services,
    }),
  );
  return app;
}

export async function connectAccount(app: Hono) {
  return request(app, "PUT", "/integrations/olx", {
    config: { credentials: { accessToken: "token_1" } },
    provider: "olx",
    status: "active",
  });
}

export function post(app: Hono, path: string, body: Record<string, unknown>) {
  return request(app, "POST", path, body);
}

export function get(app: Hono, path: string) {
  return app.request(`/api/v1/marketplaces${path}`);
}

export function createGateway(options: GatewayOptions = {}) {
  const calls: MarketplacePublishInput[] = [];
  const authorizationRequests: { redirectUri: string; state: string }[] = [];
  const tokenRequests: { code: string; redirectUri: string }[] = [];
  const failedOnce = new Set<string>();
  let tokenExchangeAttempts = 0;
  const gateway: MarketplaceProviderGateway & {
    authorizationRequests: { redirectUri: string; state: string }[];
    calls: MarketplacePublishInput[];
    tokenRequests: { code: string; redirectUri: string }[];
  } = {
    authorizationRequests,
    calls,
    checkAccount: async () =>
      options.accountStatus ?? {
        accountId: "provider_user_1",
        requirements: [],
        status: "connected",
      },
    createAuthorizationUrl: async (input) => {
      authorizationRequests.push(input);
      const url = new URL("https://provider.test/oauth");
      url.searchParams.set("redirect_uri", input.redirectUri);
      url.searchParams.set("state", input.state);
      return url.toString();
    },
    exchangeAuthorizationCode: async (input) => {
      tokenRequests.push(input);
      tokenExchangeAttempts += 1;
      if (options.failTokenExchangeOnce && tokenExchangeAttempts === 1) {
        throw new Error("provider unavailable");
      }
      return {
        accessToken: options.accessToken ?? "token_1",
        expiresAt: null,
        providerAccountId: "provider_user_1",
        refreshToken: null,
        scope: options.scope ?? "basic_user_info autoupload autoservice chat",
        tokenType: "Bearer",
      };
    },
    provider: "olx",
    runListingSync: async (input) => {
      calls.push(input);
      const listingId = input.listing?.listingId;
      if (listingId && listingId === options.failAlwaysFor) {
        throw new Error("provider down");
      }
      if (
        listingId &&
        listingId === options.failOnceFor &&
        !failedOnce.has(listingId)
      ) {
        failedOnce.add(listingId);
        throw new Error("provider down");
      }
      const externalId = input.externalId ?? `external_${listingId ?? "item"}`;
      return {
        externalId,
        metadata: {
          providerResult: {
            externalId,
            providerRequestId: "provider_request_1",
            providerStatus: "active",
          },
        },
        providerStatus: "active",
      };
    },
    tokenRequests,
  };
  return gateway;
}

function request(
  app: Hono,
  method: "POST" | "PUT",
  path: string,
  body: Record<string, unknown>,
) {
  return app.request(`/api/v1/marketplaces${path}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method,
  });
}

function resolvedRepository(
  repository: MarketplaceRepository,
): MarketplaceRepository {
  return {
    ...repository,
    findCatalogMapping: async (input) =>
      createResolvedMarketplaceCatalogMapping(input.provider),
  };
}

type TestAppOptions = {
  audit?: ReturnType<typeof createMemoryAuditSink>;
  entitlements?: string[];
  gateway?: ReturnType<typeof createGateway>;
  olxCrmOnboarding?: MarketplaceServicePorts["olxCrmOnboarding"];
  permissions?: string[];
  requestId?: string;
  repository?: MarketplaceRepository;
};

type GatewayOptions = {
  accessToken?: string;
  accountStatus?: MarketplaceProviderAccountStatus;
  failAlwaysFor?: string;
  failOnceFor?: string;
  failTokenExchangeOnce?: boolean;
  scope?: string | null;
};
