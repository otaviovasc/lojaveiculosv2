import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryAuditSink } from "../../../../shared/auditSink.js";
import {
  createNoopServiceLogger,
  createServiceContext,
} from "../../../../shared/serviceContext.js";
import { createTestMarketplaceRepository } from "../../testSupportMarketplaceRepository.js";
import type { MarketplaceProviderGateway } from "../../ports/marketplaceProviderGateway.js";
import { listMarketplaceOverview } from "./listMarketplaceOverview.js";

describe("listMarketplaceOverview", () => {
  it("uses the scoped operational account for preflight, not redacted overview credentials", async () => {
    const repository = createTestMarketplaceRepository();
    await repository.upsertAccount({
      config: {
        connection: { providerAccountId: "provider_1" },
        credentials: { accessToken: "operational-token" },
      },
      provider: "olx",
      status: "active",
      storeId: "store_1" as StoreId,
      tenantId: "tenant_1" as TenantId,
    });
    const listOverview = repository.listOverview;
    repository.listOverview = async (scope) => {
      const overview = await listOverview(scope);
      return {
        ...overview,
        accounts: overview.accounts.map((account) => ({
          ...account,
          config: { credentials: { accessToken: "[redacted]" } },
        })),
      };
    };
    const checkAccount = vi.fn<MarketplaceProviderGateway["checkAccount"]>(
      async ({ token }) => ({
        accountId: token.providerAccountId,
        requirements: [],
        status: "connected" as const,
      }),
    );

    const overview = await listMarketplaceOverview(createContext(), {
      gatewayRegistry: {
        getGateway: () =>
          ({ checkAccount }) as unknown as MarketplaceProviderGateway,
      },
      marketplaceRepository: repository,
    });

    expect(checkAccount).toHaveBeenCalledTimes(1);
    expect(checkAccount.mock.calls[0]?.[0].token.accessToken).toBe(
      "operational-token",
    );
    expect(overview.accounts[0]?.config).toEqual({
      credentials: { accessToken: "[redacted]" },
    });
  });
});

function createContext() {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit: createMemoryAuditSink(),
      logger: createNoopServiceLogger(),
      permissions: ["marketplace.read"],
      request: { requestId: "request_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    { entitlements: ["marketplace" as const] },
  );
}
