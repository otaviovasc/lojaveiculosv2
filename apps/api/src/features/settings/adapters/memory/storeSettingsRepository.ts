import type {
  StoreSettingsRepository,
  StoreSettingsSnapshot,
  UpdateStoreSettingsInput,
} from "../../../../domains/settings/ports/storeSettingsRepository.js";

export function createMemoryStoreSettingsRepository(
  initial?: StoreSettingsSnapshot,
): StoreSettingsRepository {
  let settings = initial ?? createDefaultSettings();

  return {
    async findByStore(input) {
      if (settings.storeId !== input.storeId) return null;
      if (settings.tenantId !== input.tenantId) return null;
      return settings;
    },
    async update(input) {
      settings = {
        identity: { ...settings.identity, ...(input.identity ?? {}) },
        profile: { ...settings.profile, ...(input.profile ?? {}) },
        publicSite: { ...settings.publicSite, ...(input.publicSite ?? {}) },
        storeId: input.storeId,
        tenantId: input.tenantId,
      };
      return settings;
    },
  };
}

function createDefaultSettings(): StoreSettingsSnapshot {
  return {
    identity: {
      legalName: "Loja Teste LTDA",
      primaryDomain: "test-store.lojaveiculos.com.br",
      publicSlug: "test-store",
      tradingName: "Loja Teste",
    },
    profile: {
      addressCity: null,
      addressLine1: null,
      addressLine2: null,
      addressState: null,
      addressZipCode: null,
      businessHours: {},
      contactEmail: null,
      contactPhone: null,
      documentNumber: null,
      logoImageUrl: null,
      whatsappPhone: null,
    },
    publicSite: {
      customDomain: null,
      customDomainStatus: "not_configured",
      heroImageUrl: null,
      isPublished: false,
      lastDnsCheckAt: null,
      layoutKey: "default",
      seoDescription: null,
      seoTitle: null,
      theme: {},
      verificationToken: null,
      verifiedAt: null,
    },
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  };
}
