import { describe, expect, it, vi } from "vitest";
import type { MarketplaceAccount } from "../../ports/marketplaceRepository.js";
import { checkMarketplaceAccountPreflight } from "./marketplaceAccountPreflight.js";

describe("checkMarketplaceAccountPreflight", () => {
  it("blocks OLX stock IO without the autoupload scope", async () => {
    const checkAccount = vi.fn();
    const result = await checkMarketplaceAccountPreflight({
      account: olxAccount("chat autoservice"),
      gatewayRegistry: { getGateway: () => ({ checkAccount }) as never },
      provider: "olx",
    });

    expect(result.status).toBe("blocked");
    expect(result.requirements[0]?.message).toContain("stock access");
    expect(checkAccount).not.toHaveBeenCalled();
  });
});

function olxAccount(scope: string): MarketplaceAccount {
  return {
    config: {
      connection: { scope },
      credentials: { accessToken: "token_1" },
    },
    createdAt: new Date(),
    id: "account_1",
    provider: "olx",
    status: "active",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
    updatedAt: new Date(),
  };
}
