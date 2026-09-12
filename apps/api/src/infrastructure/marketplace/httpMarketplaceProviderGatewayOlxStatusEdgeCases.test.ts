import { describe, expect, it, vi } from "vitest";
import type { MarketplaceListingReconciliationInput } from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import { createOlxTestGateway } from "./httpMarketplaceProviderGatewayOlxTestSupport.js";
import {
  jsonResponse,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";

describe("OLX listing reconciliation edge cases", () => {
  it("keeps a completed import with no matching ad as unknown", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        ads: {
          another_integrator_ad: {
            list_id: "9000000",
            operation: "edit",
            status: "accepted",
          },
        },
        autoupload_status: "done",
      }),
    );
    const gateway = createOlxTestGateway(fetch);
    if (!gateway.reconcileListingSync) throw new Error("Missing reconciler");

    const reconciled = await gateway.reconcileListingSync(input());

    expect(reconciled).toMatchObject({
      externalId: "integrator_1",
      providerStatus: "done",
      state: "unknown",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

function input(): MarketplaceListingReconciliationInput {
  return {
    externalId: "integrator_1",
    jobType: "listing_update",
    listId: "8000000",
    operationToken: "import_token_1",
    token: tokenSet(),
  };
}
