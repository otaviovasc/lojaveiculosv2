import { describe, expect, it, vi } from "vitest";
import type { MarketplaceListingReconciliationInput } from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import { createOlxTestGateway } from "./httpMarketplaceProviderGatewayOlxTestSupport.js";
import {
  jsonResponse,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";

describe("OLX listing reconciliation", () => {
  it("polls the import then verifies the current accepted listing", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          ads: {
            integrator_1: {
              list_id: "8000000",
              operation: "edit",
              status: "accept",
            },
          },
          autoupload_status: "done",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "integrator_1",
          list_id: "8000000",
          status: "accepted",
          url: "https://www.olx.com.br/vi/8000000.htm",
        }),
      );

    const reconciled = await reconcile(fetch, input());

    expect(reconciled).toEqual({
      externalId: "integrator_1",
      listId: "8000000",
      listingUrl: "https://www.olx.com.br/vi/8000000.htm",
      message: null,
      providerStatus: "accepted",
      state: "accepted",
    });
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://apps.olx.test/autoupload/import/import_token_1",
    );
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      body: JSON.stringify({ access_token: "token_1" }),
      method: "POST",
      redirect: "error",
    });
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({
      headers: { Authorization: "Bearer token_1" },
      method: "GET",
      redirect: "error",
    });
  });

  it.each(["pending", "queued"] as const)(
    "keeps import state %s pending without reading historical listing state",
    async (status) => {
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        jsonResponse({
          ads: { integrator_1: { list_id: "8000000", status } },
          autoupload_status: "pending",
        }),
      );

      const reconciled = await reconcile(fetch, input());

      expect(reconciled).toMatchObject({
        listId: "8000000",
        providerStatus: status,
        state: status,
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["refused", "error"] as const)(
    "normalizes %s and returns only a bounded sanitized message",
    async (status) => {
      const secret = "a".repeat(40);
      const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
        jsonResponse({
          ads: {
            integrator_1: {
              message: [
                {
                  error: `REFUSED_GENERIC ${secret} https://bad.test/x seller@example.test 11999999999 ABC1D23`,
                },
              ],
              operation: "edit",
              status,
            },
          },
          autoupload_status: "done",
        }),
      );

      const reconciled = await reconcile(fetch, input());

      expect(reconciled).toMatchObject({
        providerStatus: status,
        state: status,
      });
      expect(reconciled.message).toContain("REFUSED_GENERIC [redacted] [url]");
      expect(reconciled.message?.length).toBeLessThanOrEqual(320);
      expect(JSON.stringify(reconciled)).not.toContain(secret);
      expect(JSON.stringify(reconciled)).not.toContain("seller@example.test");
      expect(JSON.stringify(reconciled)).not.toContain("11999999999");
      expect(JSON.stringify(reconciled)).not.toContain("ABC1D23");
    },
  );

  it("treats an accepted delete import as deleted", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        ads: {
          integrator_1: { operation: "delete", status: "accepted" },
        },
        autoupload_status: "done",
      }),
    );

    const reconciled = await reconcile(fetch, {
      ...input(),
      jobType: "listing_unpublish",
      listId: null,
    });

    expect(reconciled).toMatchObject({
      providerStatus: "accepted",
      state: "deleted",
    });
  });

  it.each([
    ["pending", "pending"],
    ["accepted", "unknown"],
    ["refused", "refused"],
    ["deleted", "deleted"],
    ["error", "unknown"],
  ] as const)("reads current OLX status %s as %s", async (status, state) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        jsonResponse({ id: "integrator_1", list_id: "8000000", status }),
      );

    const reconciled = await reconcile(fetch, {
      ...input(),
      operationToken: null,
    });

    expect(reconciled).toMatchObject({ providerStatus: status, state });
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://apps.olx.test/autoupload/ads/8000000",
    );
  });

  it("does not accept a timed-out update because the old ad remains published", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({ reason: "TOKEN_EXPIRED" }, 404))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [{ id: "another", status: "published" }],
          next_token: "next page/token",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: "integrator_1",
              list_id: "8000000",
              status: "published",
            },
          ],
          next_token: null,
        }),
      );

    const reconciled = await reconcile(fetch, { ...input(), listId: null });

    expect(reconciled).toMatchObject({
      listId: "8000000",
      providerStatus: "published",
      state: "unknown",
    });
    expect(String(fetch.mock.calls[2]?.[0])).toContain(
      "page_token=next+page%2Ftoken",
    );
  });

  it("preserves future publication statuses as unknown", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        data: [{ id: "integrator_1", status: "paused_by_policy_v2" }],
        next_token: null,
      }),
    );

    const reconciled = await reconcile(fetch, {
      ...input(),
      listId: null,
      operationToken: null,
    });

    expect(reconciled).toMatchObject({
      providerStatus: "paused_by_policy_v2",
      state: "unknown",
    });
  });

  it("maps status rate limits with retry-after and no raw payload", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({ message: "secret provider response" }, 429, {
        "retry-after": "17",
      }),
    );

    await expect(reconcile(fetch, input())).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_RATE_LIMITED",
      details: { provider: "olx", retryAfterSeconds: 17 },
      retryAfterSeconds: 17,
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
