import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { MarketplaceAccount } from "../ports/marketplaceRepository.js";
import { readMarketplaceProviderCapabilities } from "./marketplaceProviderCapabilities.js";

describe("marketplace provider capability projection", () => {
  it("keeps OLX chat, leads and stock outcomes independent", () => {
    expect(
      readMarketplaceProviderCapabilities("olx", createAccount()),
    ).toMatchObject({
      chat: { reason: "provider_outcome_indeterminate", status: "error" },
      leads: { reason: null, status: "active" },
      stock: { reason: "missing_scope", status: "blocked" },
    });
  });

  it("fails closed when a persisted capability is malformed", () => {
    const account = createAccount();
    const connection = account.config.connection as Record<string, unknown>;
    const capabilities = connection.olxCapabilities as Record<string, unknown>;
    capabilities.stock = { capability: "inventory_sync", status: "active" };

    expect(readMarketplaceProviderCapabilities("olx", account)).toBeNull();
  });
});

function createAccount(): MarketplaceAccount {
  return {
    config: {
      connection: {
        olxCapabilities: {
          chat: {
            capability: "messaging",
            grantState: "granted",
            reason: "provider_outcome_indeterminate",
            status: "error",
          },
          leads: {
            capability: "lead_ingestion",
            grantState: "granted",
            reason: null,
            status: "active",
          },
          stock: {
            capability: "inventory_sync",
            grantState: "denied",
            reason: "missing_scope",
            status: "blocked",
          },
        },
      },
    },
    createdAt: new Date(),
    id: "account_1",
    provider: "olx",
    status: "active",
    storeId: "store_1" as StoreId,
    tenantId: "tenant_1" as TenantId,
    updatedAt: new Date(),
  };
}
