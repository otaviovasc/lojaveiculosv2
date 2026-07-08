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
import { createMarketplaceServices } from "./marketplaceServices.js";

export function createTestApp(options: TestAppOptions = {}) {
  const app = new Hono();
  const repository = resolvedRepository(
    options.repository ?? createTestMarketplaceRepository(),
  );
  const gateway = options.gateway ?? createGateway();
  app.route(
    "/api/v1/marketplaces",
    createMarketplaceFeature({
      contextFactory: async () =>
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
            ],
            request: { requestId: "request_1" },
            storeId: "store_1",
            tenantId: "tenant_1",
          }),
          { entitlements: options.entitlements ?? ["marketplace"] },
        ),
      services: createMarketplaceServices({
        ports: {
          gatewayRegistry: { getGateway: () => gateway },
          marketplaceRepository: repository,
        },
      }),
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
  const failedOnce = new Set<string>();
  const gateway: MarketplaceProviderGateway & {
    calls: MarketplacePublishInput[];
  } = {
    calls,
    checkAccount: async () =>
      options.accountStatus ?? {
        accountId: "provider_user_1",
        requirements: [],
        status: "connected",
      },
    createAuthorizationUrl: async () => "https://provider.test/oauth",
    exchangeAuthorizationCode: async () => ({
      accessToken: "token_1",
      expiresAt: null,
      providerAccountId: "provider_user_1",
      refreshToken: null,
      scope: null,
      tokenType: "Bearer",
    }),
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
  permissions?: string[];
  repository?: MarketplaceRepository;
};

type GatewayOptions = {
  accountStatus?: MarketplaceProviderAccountStatus;
  failAlwaysFor?: string;
  failOnceFor?: string;
};
