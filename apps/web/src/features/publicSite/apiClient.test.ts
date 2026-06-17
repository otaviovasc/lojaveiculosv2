import { describe, expect, it } from "vitest";
import { createPublicStorefrontApi } from "./apiClient";
import { publicStorefrontPreview } from "./fixtures";

type FetchCall = {
  init: RequestInit | undefined;
  input: RequestInfo | URL;
};

describe("createPublicStorefrontApi", () => {
  it("lists public storefront vehicles with query params", async () => {
    const calls: FetchCall[] = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ init, input });
      return new Response(JSON.stringify(publicStorefrontPreview), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    };
    const api = createPublicStorefrontApi({
      baseUrl: "https://demo.lojaveiculos.com.br/api/v1/",
      fetch: fakeFetch,
    });

    const result = await api.listListings({ limit: 6 });

    expect(result.store.slug).toBe("demo");
    expect(calls[0]).toMatchObject({
      input:
        "https://demo.lojaveiculos.com.br/api/v1/public/storefront/listings?limit=6",
      init: { method: "GET" },
    });
  });

  it("fails on non-2xx responses", async () => {
    const api = createPublicStorefrontApi({
      fetch: async () => new Response(null, { status: 404 }),
    });

    await expect(api.listListings()).rejects.toThrow(
      "Public storefront request failed with status 404",
    );
  });
});
