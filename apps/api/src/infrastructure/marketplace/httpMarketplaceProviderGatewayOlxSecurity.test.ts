import { describe, expect, it, vi } from "vitest";
import type { MarketplaceListingReconciliationInput } from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import { createOlxTestGateway } from "./httpMarketplaceProviderGatewayOlxTestSupport.js";
import {
  jsonResponse,
  listingProjection,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";

describe("OLX gateway reconciliation security", () => {
  it("does not accept terminal evidence for a different operation", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        ads: {
          integrator_1: {
            list_id: "8000000",
            operation: "insert",
            status: "accepted",
          },
        },
      }),
    );

    const reconciled = await reconcile(fetch, input());

    expect(reconciled).toMatchObject({
      providerStatus: "accepted",
      state: "unknown",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("keeps accepted import evidence pending when current status still returns 404", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          ads: {
            integrator_1: {
              list_id: "8000000",
              operation: "edit",
              status: "accepted",
            },
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({}, 404));

    const reconciled = await reconcile(fetch, input());

    expect(reconciled).toMatchObject({
      listId: "8000000",
      providerStatus: "accepted",
      state: "pending",
    });
  });

  it("keeps a completed import unknown when it has no matching ad entry", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        ads: {
          another_ad: { operation: "edit", status: "accepted" },
        },
        autoupload_status: "done",
      }),
    );

    const reconciled = await reconcile(fetch, input());

    expect(reconciled).toMatchObject({
      providerStatus: "done",
      state: "unknown",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects mismatched current listing identity as unknown", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        id: "another_integrator_id",
        list_id: "8000000",
        status: "accepted",
      }),
    );

    const reconciled = await reconcile(fetch, {
      ...input(),
      operationToken: null,
    });

    expect(reconciled).toMatchObject({ state: "unknown" });
  });

  it("drops non-HTTPS listing URLs", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        id: "integrator_1",
        list_id: "8000000",
        status: "accepted",
        url: "http://www.olx.com.br/vi/8000000.htm",
      }),
    );

    const reconciled = await reconcile(fetch, {
      ...input(),
      operationToken: null,
    });

    expect(reconciled.listingUrl).toBeNull();
  });

  it("does not infer deletion from an unpublish job without delete evidence", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        id: "integrator_1",
        list_id: "8000000",
        status: "accepted",
      }),
    );

    const reconciled = await reconcile(fetch, {
      ...input(),
      jobType: "listing_unpublish",
      operationToken: null,
    });

    expect(reconciled).toMatchObject({
      providerStatus: "accepted",
      state: "accepted",
    });
  });

  it("rejects oversized OLX responses before parsing them", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({ statusCode: 0, token: "import_token" }, 200, {
        "content-length": "70000",
      }),
    );

    await expect(
      createOlxTestGateway(fetch).runListingSync({
        jobType: "listing_publish",
        listing: listingProjection(),
        metadata: {},
        token: tokenSet(),
      }),
    ).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_UNAVAILABLE",
      status: 503,
    });
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

async function reconcile(
  fetch: typeof globalThis.fetch,
  value: MarketplaceListingReconciliationInput,
) {
  const gateway = createOlxTestGateway(fetch);
  if (!gateway.reconcileListingSync) throw new Error("Missing OLX reconciler");
  return gateway.reconcileListingSync(value);
}
