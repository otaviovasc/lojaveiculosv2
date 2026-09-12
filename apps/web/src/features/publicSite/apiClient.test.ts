import { describe, expect, it, vi } from "vitest";
import {
  createPublicStorefrontApi,
  listAllPublicStorefrontListings,
  publicStorefrontRoutes,
  type PublicStorefrontApi,
  type PublicStorefrontQuery,
} from "./apiClient";
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

    const result = await api.listListings({ limit: 6, offset: 12 });

    expect(result.store.slug).toBe("demo");
    expect(calls[0]).toMatchObject({
      input:
        "https://demo.lojaveiculos.com.br/api/v1/public/storefront/listings?limit=6&offset=12",
      init: { method: "GET" },
    });
  });

  it("loads every public listing in pages of 48", async () => {
    const firstListing = publicStorefrontPreview.listings[0]!;
    const listings = Array.from({ length: 97 }, (_, index) => ({
      ...firstListing,
      slug: `vehicle-${index}`,
    }));
    const api = {
      getCustomPage: vi.fn(),
      getListing: vi.fn(),
      getSettings: vi.fn(),
      listListings: vi.fn(async (query: PublicStorefrontQuery = {}) => ({
        listings: listings.slice(
          query.offset ?? 0,
          (query.offset ?? 0) + (query.limit ?? 24),
        ),
        store: publicStorefrontPreview.store,
      })),
      submitListingInterest: vi.fn(),
      submitStorefrontInterest: vi.fn(),
    } satisfies PublicStorefrontApi;

    const result = await listAllPublicStorefrontListings(api);

    expect(result.listings).toHaveLength(97);
    expect(api.listListings).toHaveBeenNthCalledWith(1, {
      limit: 48,
      offset: 0,
    });
    expect(api.listListings).toHaveBeenNthCalledWith(2, {
      limit: 48,
      offset: 48,
    });
    expect(api.listListings).toHaveBeenNthCalledWith(3, {
      limit: 48,
      offset: 96,
    });
  });

  it("fails fast when a full page repeats without new listings", async () => {
    const firstListing = publicStorefrontPreview.listings[0]!;
    const listings = Array.from({ length: 48 }, (_, index) => ({
      ...firstListing,
      slug: `vehicle-${index}`,
    }));
    const listListings = vi.fn(async () => ({
      listings,
      store: publicStorefrontPreview.store,
    }));
    const api = {
      getCustomPage: vi.fn(),
      getListing: vi.fn(),
      getSettings: vi.fn(),
      listListings,
      submitListingInterest: vi.fn(),
      submitStorefrontInterest: vi.fn(),
    } satisfies PublicStorefrontApi;

    await expect(listAllPublicStorefrontListings(api)).rejects.toThrow(
      "Public storefront pagination made no progress.",
    );
    expect(listListings).toHaveBeenCalledTimes(2);
  });

  it("fails on non-2xx responses", async () => {
    const api = createPublicStorefrontApi({
      fetch: async () => new Response(null, { status: 404 }),
    });

    await expect(api.listListings()).rejects.toThrow(
      "Nao encontramos esse registro. Atualize a tela e tente novamente.",
    );
  });

  it("gets one public storefront vehicle detail by encoded slug", async () => {
    const calls: FetchCall[] = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ init, input });
      return new Response(
        JSON.stringify({
          listing: {
            ...publicStorefrontPreview.listings[0],
            media: [],
            mediaGroups: [],
          },
          store: publicStorefrontPreview.store,
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      );
    };
    const api = createPublicStorefrontApi({ fetch: fakeFetch });

    const result = await api.getListing("fiat toro 2023");

    expect(result.listing.slug).toBe("fiat-toro-2023");
    expect(calls[0]).toMatchObject({
      input: "/api/v1/public/storefront/listings/fiat%20toro%202023",
      init: { method: "GET" },
    });
  });

  it("gets public storefront settings", async () => {
    const calls: FetchCall[] = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ init, input });
      return new Response(JSON.stringify(publicStorefrontPreview.settings), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    };
    const api = createPublicStorefrontApi({ fetch: fakeFetch });

    const result = await api.getSettings();

    expect(result.store.slug).toBe("demo");
    expect(calls[0]).toMatchObject({
      input: "/api/v1/public/storefront/settings",
      init: { method: "GET" },
    });
  });

  it("sends explicit store slug headers for slug-based public routes", async () => {
    const calls: FetchCall[] = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ init, input });
      return new Response(JSON.stringify(publicStorefrontPreview.settings), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    };
    const api = createPublicStorefrontApi({
      fetch: fakeFetch,
      storeSlug: "demo",
    });

    await api.getSettings();

    expect(calls[0]?.init?.headers).toEqual({ "x-store-slug": "demo" });
  });

  it("submits listing interest to public lead endpoint", async () => {
    const calls: FetchCall[] = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ init, input });
      return new Response(
        JSON.stringify({
          deduplicated: false,
          lead: { id: "lead_1", source: "public_site", status: "new" },
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 201,
        },
      );
    };
    const api = createPublicStorefrontApi({ fetch: fakeFetch });

    const result = await api.submitListingInterest("fiat toro 2023", {
      buyerEmail: "ana@example.com",
      buyerName: "Ana Cliente",
      buyerPhone: "11999999999",
      formStartedAt: 1_700_000_000_000,
      message: "Tenho interesse.",
      website: "",
    });

    expect(result.lead.id).toBe("lead_1");
    expect(result.deduplicated).toBe(false);
    expect(calls[0]).toMatchObject({
      input: "/api/v1/public/storefront/listings/fiat%20toro%202023/leads",
      init: {
        body: JSON.stringify({
          buyerEmail: "ana@example.com",
          buyerName: "Ana Cliente",
          buyerPhone: "11999999999",
          formStartedAt: 1_700_000_000_000,
          message: "Tenho interesse.",
          website: "",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    });
  });

  it("submits landing-page interest without a listing", async () => {
    const calls: FetchCall[] = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ init, input });
      return new Response(
        JSON.stringify({
          deduplicated: false,
          lead: { id: "lead_2", source: "public_site", status: "new" },
        }),
        { headers: { "Content-Type": "application/json" }, status: 201 },
      );
    };
    const api = createPublicStorefrontApi({ fetch: fakeFetch });

    await api.submitStorefrontInterest({
      buyerEmail: "ana@example.com",
      buyerName: "Ana Cliente",
      buyerPhone: "11999999999",
      formStartedAt: 1_700_000_000_000,
      message: "Quero conhecer a loja.",
      website: "",
    });

    expect(calls[0]).toMatchObject({
      input: "/api/v1/public/storefront/leads",
      init: {
        body: JSON.stringify({
          buyerEmail: "ana@example.com",
          buyerName: "Ana Cliente",
          buyerPhone: "11999999999",
          formStartedAt: 1_700_000_000_000,
          message: "Quero conhecer a loja.",
          website: "",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    });
  });

  it("builds listing lead routes", () => {
    expect(
      publicStorefrontRoutes.listingLead(
        "civic touring",
        "https://demo/api/v1/",
      ),
    ).toBe(
      "https://demo/api/v1/public/storefront/listings/civic%20touring/leads",
    );
  });

  it("builds landing-page lead routes", () => {
    expect(publicStorefrontRoutes.lead("https://demo/api/v1/")).toBe(
      "https://demo/api/v1/public/storefront/leads",
    );
  });

  it("builds listing detail routes", () => {
    expect(
      publicStorefrontRoutes.listing("civic touring", "https://demo/api/v1/"),
    ).toBe("https://demo/api/v1/public/storefront/listings/civic%20touring");
  });
});
