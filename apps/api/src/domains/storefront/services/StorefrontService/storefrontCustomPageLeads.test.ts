import { describe, expect, it, vi } from "vitest";
import type {
  StorefrontBuilderConfig,
  StorefrontCustomPage,
  StoreId,
  TenantId,
} from "@lojaveiculosv2/shared";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { PublicStorefrontLeadSink } from "../../ports/publicStorefrontLeadSink.js";
import type { StorefrontPageRepository } from "../../ports/storefrontPageRepository.js";
import { createPublicStorefrontPageLead } from "./createPublicStorefrontPageLead.js";
import { StorefrontPageNotFoundError } from "./serviceSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const defaultConfig: StorefrontBuilderConfig = {
  accentColor: "#C9A84C",
  backgroundColor: "#F8F5F0",
  contact: {},
  fonts: { body: "Inter", heading: "Plus Jakarta Sans" },
  socialLinks: {},
  storeName: "Loja Demo",
  templateId: "classic",
};

describe("storefront custom page leads", () => {
  it("creates page-level public leads without a vehicle listing", async () => {
    const page = createPage({ visible: true });
    const repository = createPublicRepository({ page, sitePublished: true });
    const leadSink = createLeadSink();

    const result = await createPublicStorefrontPageLead(
      createPublicLeadContext(),
      {
        buyerEmail: "cliente@example.com",
        buyerName: "Cliente Demo",
        buyerPhone: "11999999999",
        message: "Quero falar com a loja",
        pageSlug: page.slug,
        storeSlug: "demo",
      },
      { leadSink, pageRepository: repository },
    );

    expect(result.deduplicated).toBe(false);
    const leadInput = vi.mocked(leadSink.createLead).mock.calls[0]?.[0];
    expect(leadInput).toMatchObject({
      buyerName: "Cliente Demo",
      listingId: null,
      storeId,
      tenantId,
    });
    expect(leadInput?.metadata).toMatchObject({
      pageId: page.id,
      pageSlug: page.slug,
      sourceChannel: "custom_page",
    });
  });

  it("blocks page-level leads for hidden public pages", async () => {
    const page = createPage({ visible: false });
    const repository = createPublicRepository({ page, sitePublished: true });

    await expect(
      createPublicStorefrontPageLead(
        createPublicLeadContext(),
        {
          buyerName: "Cliente Demo",
          pageSlug: page.slug,
          storeSlug: "demo",
        },
        { leadSink: createLeadSink(), pageRepository: repository },
      ),
    ).rejects.toBeInstanceOf(StorefrontPageNotFoundError);
  });
});

function createPublicLeadContext() {
  return createServiceContext({
    audit: { record: vi.fn(async () => undefined) },
    permissions: ["public_storefront.lead_create"],
    request: { requestId: "req_1" },
  });
}

function createLeadSink(): PublicStorefrontLeadSink {
  return {
    createLead: vi.fn<PublicStorefrontLeadSink["createLead"]>(
      async (input) => ({
        buyerEmail: input.buyerEmail,
        buyerPhone: input.buyerPhone,
        createdAt: new Date(),
        id: "lead_1",
        listingId: input.listingId,
        source: "public_site" as const,
        status: "new",
      }),
    ),
    listLeads: vi.fn<PublicStorefrontLeadSink["listLeads"]>(async () => []),
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
