import { describe, expect, it, vi } from "vitest";
import { createStorefrontFeature } from "./storefront.controller.js";
import {
  createCrmRepository,
  createRepository,
  expectApiError,
  listingResponse,
  publicStore,
  site,
} from "./storefront.controller.testSupport.js";

describe("public storefront routes", () => {
  it("gets public site settings for the store resolved from host", async () => {
    const repository = createRepository();
    const app = createStorefrontFeature({ repository });

    const response = await app.request("/settings", {
      headers: { host: "demo.lojaveiculos.com.br" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      contact: site.contact,
      site: site.site,
      store: {
        name: "Loja Demo",
        publicUrl: "demo.lojaveiculos.com.br",
        slug: "demo",
      },
    });
    expect(repository.findPublicSiteBySlug).toHaveBeenCalledWith("demo");
  });

  it("lists public vehicles for the store resolved from host", async () => {
    const repository = createRepository();
    const app = createStorefrontFeature({ repository });

    const response = await app.request("/listings?limit=1", {
      headers: { host: "demo.lojaveiculos.com.br" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      listings: [listingResponse],
      store: publicStore,
    });
    expect(repository.findPublicStoreBySlug).toHaveBeenCalledWith("demo");
    expect(repository.listPublicListings).toHaveBeenCalledWith({
      limit: 1,
      storeId: "store_1",
      tenantId: "tenant_1",
    });
  });

  it("resolves custom domain hosts through the storefront repository", async () => {
    const repository = createRepository();
    const app = createStorefrontFeature({ repository });

    const response = await app.request("/settings", {
      headers: { host: "www.autocerto.com.br" },
    });

    expect(response.status).toBe(200);
    expect(repository.findPublicSiteBySlug).toHaveBeenCalledWith(
      "www.autocerto.com.br",
    );
  });

  it("rejects requests without a store subdomain", async () => {
    const app = createStorefrontFeature({ repository: createRepository() });
    const response = await app.request("/listings", {
      headers: { host: "lojaveiculos.com.br" },
    });

    expect(response.status).toBe(400);
    await expectApiError(response, {
      code: "STOREFRONT_STORE_SLUG_REQUIRED",
      message: "Store subdomain is required.",
    });
  });

  it("gets public vehicle detail for the store resolved from host", async () => {
    const repository = createRepository();
    const app = createStorefrontFeature({ repository });

    const response = await app.request("/listings/fiat-toro-2023", {
      headers: { host: "demo.lojaveiculos.com.br" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      listing: listingResponse,
      store: publicStore,
    });
    expect(repository.findPublicListingDetail).toHaveBeenCalledWith({
      listingSlug: "fiat-toro-2023",
      storeId: "store_1",
      tenantId: "tenant_1",
    });
  });

  it("creates public storefront lead for a listing", async () => {
    const repository = createRepository();
    const crmRepository = createCrmRepository();
    const audit = { record: vi.fn(async () => undefined) };
    const app = createStorefrontFeature({ audit, crmRepository, repository });

    const response = await app.request("/listings/fiat-toro-2023/leads", {
      body: JSON.stringify({
        buyerEmail: "ana@example.com",
        buyerName: "Ana Cliente",
        buyerPhone: "11999999999",
        message: "Tenho interesse.",
      }),
      headers: {
        "content-type": "application/json",
        host: "demo.lojaveiculos.com.br",
      },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      deduplicated: false,
      lead: {
        id: "lead_1",
        source: "public_site",
        status: "new",
      },
    });
    expect(crmRepository.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerEmail: "ana@example.com",
        buyerName: "Ana Cliente",
        buyerPhone: "11999999999",
        listingId: "listing_1",
        source: "public_site",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
    const [leadInput] = vi.mocked(crmRepository.createLead).mock.calls[0] ?? [];
    expect(leadInput?.metadata).toEqual(
      expect.objectContaining({
        listingId: "listing_1",
        listingSlug: "fiat-toro-2023",
        listingTitle: "Fiat Toro Volcano 2023",
        sourceChannel: "storefront",
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "public_storefront.lead.create",
        entityId: "lead_1",
      }),
    );
  });

  it("rate limits repeated public storefront lead attempts", async () => {
    const app = createStorefrontFeature({
      leadRateLimiter: {
        check: vi.fn(() => ({ allowed: false, retryAfterSeconds: 60 })),
      },
      repository: createRepository(),
    });

    const response = await app.request("/listings/fiat-toro-2023/leads", {
      body: JSON.stringify({ buyerName: "Ana Cliente" }),
      headers: {
        "content-type": "application/json",
        host: "demo.lojaveiculos.com.br",
      },
      method: "POST",
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    await expectApiError(response, {
      code: "PUBLIC_LEAD_RATE_LIMITED",
      details: { retryAfterSeconds: 60 },
      message: "Too many lead requests.",
    });
  });

  it("rejects invalid public storefront lead input", async () => {
    const app = createStorefrontFeature({ repository: createRepository() });

    const response = await app.request("/listings/fiat-toro-2023/leads", {
      body: JSON.stringify({ buyerEmail: "invalid", buyerName: "" }),
      headers: {
        "content-type": "application/json",
        host: "demo.lojaveiculos.com.br",
      },
      method: "POST",
    });

    expect(response.status).toBe(400);
    await expectApiError(response, {
      code: "STOREFRONT_REQUEST_VALIDATION_ERROR",
      message: "Request body is invalid.",
    });
  });

  it("maps unknown public listings to not found", async () => {
    const app = createStorefrontFeature({
      repository: createRepository({ includeListing: false }),
    });
    const response = await app.request("/listings/missing", {
      headers: { host: "demo.lojaveiculos.com.br" },
    });

    expect(response.status).toBe(404);
    await expectApiError(response, {
      code: "PUBLIC_STOREFRONT_LISTING_NOT_FOUND",
      message: "Public storefront listing not found: missing",
    });
  });

  it("maps unknown public stores to not found", async () => {
    const app = createStorefrontFeature({
      repository: createRepository({ includeStore: false }),
    });
    const response = await app.request("/listings", {
      headers: { host: "missing.lojaveiculos.com.br" },
    });

    expect(response.status).toBe(404);
    await expectApiError(response, {
      code: "PUBLIC_STOREFRONT_NOT_FOUND",
      message: "Public storefront not found: missing",
    });
  });
});
