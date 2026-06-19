import { describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { AuthorizationError } from "../../../../shared/authorization.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { getPublicStorefrontSite } from "./getPublicStorefrontSite.js";
import { PublicStorefrontNotFoundError } from "./serviceSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("getPublicStorefrontSite", () => {
  it("returns only the public storefront settings projection", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const result = await getPublicStorefrontSite(
      createPublicContext(audit),
      { storeSlug: "demo" },
      createRepository(),
    );

    expect(result.store).toEqual({
      name: "Loja Demo",
      publicUrl: "demo.lojaveiculos.com.br",
      slug: "demo",
    });
    expect(result.contact.whatsappUrl).toBe("https://wa.me/5511999999999");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "public_storefront.site.get" }),
    );
  });

  it("requires public storefront permission", async () => {
    await expect(
      getPublicStorefrontSite(
        createServiceContext({
          permissions: [],
          request: { requestId: "req_1" },
        }),
        { storeSlug: "demo" },
        createRepository(),
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("returns a typed not found error for unpublished or unknown stores", async () => {
    await expect(
      getPublicStorefrontSite(
        createPublicContext(),
        { storeSlug: "missing" },
        createRepository({ includeSite: false }),
      ),
    ).rejects.toBeInstanceOf(PublicStorefrontNotFoundError);
  });
});

function createPublicContext(audit = { record: vi.fn(async () => undefined) }) {
  return createServiceContext({
    audit,
    permissions: ["public_storefront.read"],
    request: { requestId: "req_1" },
  });
}

function createRepository(options: { includeSite?: boolean } = {}) {
  return {
    findPublicListingDetail: vi.fn(async () => null),
    findPublicSiteBySlug: vi.fn(async () =>
      options.includeSite === false
        ? null
        : {
            contact: {
              city: "Sao Paulo",
              contactEmail: "contato@demo.com.br",
              contactPhone: null,
              whatsappPhone: "5511999999999",
              whatsappUrl: "https://wa.me/5511999999999",
            },
            site: {
              heroImageUrl: "https://cdn.local/hero.jpg",
              layoutKey: "default",
              seoDescription: "Estoque selecionado",
              seoTitle: "Loja Demo",
              theme: {},
            },
            store: {
              id: storeId,
              name: "Loja Demo",
              publicUrl: "demo.lojaveiculos.com.br",
              slug: "demo",
              tenantId,
            },
          },
    ),
    findPublicStoreBySlug: vi.fn(async () => null),
    listPublicListings: vi.fn(async () => []),
  };
}
