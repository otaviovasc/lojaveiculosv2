import type {
  StorefrontBuilderConfig,
  StorefrontCustomPage,
} from "@lojaveiculosv2/shared";
import type {
  PublicStorefrontCustomPageSnapshot,
  StorefrontPageRepository,
} from "../../../../domains/storefront/ports/storefrontPageRepository.js";

const defaultConfig: StorefrontBuilderConfig = {
  accentColor: "#C9A84C",
  backgroundColor: "#F8F5F0",
  contact: {},
  fonts: { body: "Inter", heading: "Plus Jakarta Sans" },
  socialLinks: {},
  storeName: "Loja Demo",
  templateId: "classic",
};

export function createMemoryStorefrontPageRepository(
  initial: readonly StorefrontCustomPage[] = [],
): StorefrontPageRepository {
  let pages = [...initial];

  return {
    async createCustomPage(scope, input) {
      const page: StorefrontCustomPage = {
        components: [],
        id: crypto.randomUUID(),
        order: input.order,
        previewUrl: null,
        publicUrl: null,
        secretToken: input.secretToken,
        slug: input.slug,
        title: input.title,
        visible: false,
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
      };
      void scope;
      pages = [...pages, page];
      return page;
    },
    async deleteCustomPage(scope) {
      const before = pages.length;
      pages = pages.filter((page) => page.id !== scope.pageId);
      return pages.length !== before;
    },
    async findCustomPageById(scope) {
      return pages.find((page) => page.id === scope.pageId) ?? null;
    },
    async findPublicCustomPageBySlug(input) {
      const page = pages.find((item) => item.slug === input.pageSlug);
      if (!page) return null;
      return toPublicSnapshot(page);
    },
    async listCustomPages() {
      return [...pages].sort((a, b) => a.order - b.order);
    },
    async updateCustomPage(scope, input) {
      let updated: StorefrontCustomPage | null = null;
      pages = pages.map((page) => {
        if (page.id !== scope.pageId) return page;
        updated = { ...page, ...input };
        return updated;
      });
      return updated;
    },
  };
}

function toPublicSnapshot(
  page: StorefrontCustomPage,
): PublicStorefrontCustomPageSnapshot {
  return {
    config: defaultConfig,
    contact: {
      city: null,
      contactEmail: null,
      contactPhone: null,
      whatsappPhone: null,
      whatsappUrl: null,
    },
    page,
    sitePublished: true,
    store: {
      id: "store_1" as never,
      name: "Loja Demo",
      publicUrl: "demo.lojaveiculos.com.br",
      slug: "demo",
      tenantId: "tenant_1" as never,
    },
    vehicles: [],
  };
}
