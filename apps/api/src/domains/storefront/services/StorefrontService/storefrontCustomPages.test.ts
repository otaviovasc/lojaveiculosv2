import { describe, expect, it, vi } from "vitest";
import type {
  StorefrontBuilderConfig,
  StorefrontCustomPage,
  StoreId,
  TenantId,
} from "@lojaveiculosv2/shared";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { StorefrontPageRepository } from "../../ports/storefrontPageRepository.js";
import { createStorefrontCustomPage } from "./createStorefrontCustomPage.js";
import { getPublicStorefrontCustomPage } from "./getPublicStorefrontCustomPage.js";
import { StorefrontPageNotFoundError } from "./serviceSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const defaultConfig: StorefrontBuilderConfig = {
  accentColor: "#C9A84C",
  backgroundColor: "#F8F5F0",
  contact: {},
  fonts: { body: "Plus Jakarta Sans", heading: "Plus Jakarta Sans" },
  socialLinks: {},
  storeName: "Loja Demo",
  templateId: "classic",
};

describe("storefront custom pages", () => {
  it("creates tenant-scoped pages with normalized slugs and server tokens", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const repository = createAdminRepository();
    const page = await createStorefrontCustomPage(
      createAdminContext(audit),
      { slug: "Ofertas do Mês", title: "Ofertas" },
      repository,
    );

    expect(page.slug).toBe("ofertas-do-mes");
    expect(page.secretToken).toEqual(expect.any(String));
    expect(page.visible).toBe(false);
    await expect(
      repository.listCustomPages({ storeId, tenantId }),
    ).resolves.toHaveLength(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "storefront_pages.create",
        storeId,
        tenantId,
      }),
    );
  });

  it("hides unpublished public pages unless the preview token matches", async () => {
    const page = createPage({ visible: false });
    const repository = createPublicRepository({
      page,
      sitePublished: true,
    });

    await expect(
      getPublicStorefrontCustomPage(
        createPublicContext(),
        { pageSlug: page.slug, storeSlug: "demo" },
        repository,
      ),
    ).rejects.toBeInstanceOf(StorefrontPageNotFoundError);

    await expect(
      getPublicStorefrontCustomPage(
        createPublicContext(),
        { pageSlug: page.slug, storeSlug: "demo", token: "preview_token" },
        repository,
      ),
    ).resolves.toMatchObject({ page: { id: page.id } });
  });

  it("requires the public site to be published for public custom pages", async () => {
    const page = createPage({ visible: true });
    const repository = createPublicRepository({
      page,
      sitePublished: false,
    });

    await expect(
      getPublicStorefrontCustomPage(
        createPublicContext(),
        { pageSlug: page.slug, storeSlug: "demo" },
        repository,
      ),
    ).rejects.toBeInstanceOf(StorefrontPageNotFoundError);
  });
});

function createAdminContext(audit = { record: vi.fn(async () => undefined) }) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit,
    permissions: ["store_public_site.manage"],
    request: { requestId: "req_1" },
    storeId,
    tenantId,
  });
}

function createPublicContext() {
  return createServiceContext({
    permissions: ["public_storefront.read"],
    request: { requestId: "req_1" },
  });
}

function createAdminRepository(): StorefrontPageRepository {
  let pages: StorefrontCustomPage[] = [];
  return {
    async createCustomPage(_scope, input) {
      const page = createPage({
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        id: `page_${pages.length + 1}`,
        order: input.order,
        secretToken: input.secretToken,
        slug: input.slug,
        title: input.title,
        visible: false,
      });
      pages = [...pages, page];
      return page;
    },
    async deleteCustomPage() {
      return false;
    },
    async findCustomPageById() {
      return null;
    },
    async findPublicCustomPageBySlug() {
      return null;
    },
    async listCustomPages() {
      return pages;
    },
    async updateCustomPage() {
      return null;
    },
  };
}

function createPage(
  overrides: Partial<StorefrontCustomPage> = {},
): StorefrontCustomPage {
  return {
    components: [],
    id: "page_1",
    order: 0,
    secretToken: "preview_token",
    slug: "ofertas",
    title: "Ofertas",
    visible: true,
    ...overrides,
  };
}

function createPublicRepository(input: {
  page: StorefrontCustomPage;
  sitePublished: boolean;
}): StorefrontPageRepository {
  return {
    createCustomPage: vi.fn(async () => input.page),
    deleteCustomPage: vi.fn(async () => false),
    findCustomPageById: vi.fn(async () => input.page),
    findPublicCustomPageBySlug: vi.fn(async () => ({
      config: defaultConfig,
      contact: {
        city: null,
        contactEmail: null,
        contactPhone: null,
        whatsappPhone: null,
        whatsappUrl: null,
      },
      page: input.page,
      sitePublished: input.sitePublished,
      store: {
        id: storeId,
        name: "Loja Demo",
        publicUrl: "demo.lojaveiculos.com.br",
        slug: "demo",
        tenantId,
      },
      vehicles: [],
    })),
    listCustomPages: vi.fn(async () => [input.page]),
    updateCustomPage: vi.fn(async () => input.page),
  };
}
