import { describe, expect, it } from "vitest";
import { createStoreSettingsPatch } from "./settingsPatch";
import type { StoreSettingsSnapshot } from "./types";

describe("createStoreSettingsPatch", () => {
  it("sends only changed settings sections", () => {
    const before = createSettings();
    const after = createSettings({
      profile: {
        ...before.profile,
        whatsappPhone: "(11) 99999-0000",
      },
    });

    expect(createStoreSettingsPatch(before, after)).toEqual({
      profile: { whatsappPhone: "(11) 99999-0000" },
    });
  });

  it("does not send unchanged public site fields that would require entitlements", () => {
    const before = createSettings({
      publicSite: {
        ...createSettings().publicSite,
        customDomain: "loja.example.com",
        isPublished: true,
      },
    });
    const after = createSettings({
      identity: { ...before.identity, legalName: "Loja Nova LTDA" },
      publicSite: before.publicSite,
    });

    expect(createStoreSettingsPatch(before, after)).toEqual({
      identity: { legalName: "Loja Nova LTDA" },
    });
  });
});

function createSettings(
  input: Partial<StoreSettingsSnapshot> = {},
): StoreSettingsSnapshot {
  const settings: StoreSettingsSnapshot = {
    identity: {
      legalName: "Loja Teste LTDA",
      primaryDomain: "test-store.lojaveiculos.com.br",
      publicSlug: "test-store",
      tradingName: "Loja Teste",
    },
    profile: {
      addressCity: "Sao Paulo",
      addressLine1: "Av. Paulista",
      addressLine2: null,
      addressState: "SP",
      addressZipCode: "01310-930",
      businessHours: { text: "Segunda a Sexta, 9h as 18h" },
      contactEmail: "contato@example.com",
      contactPhone: "(11) 3000-0000",
      documentNumber: "11.222.333/0001-81",
      logoImageUrl: null,
      whatsappPhone: "(11) 90000-0000",
    },
    publicSite: {
      customDomain: null,
      customDomainStatus: "not_configured",
      heroImageUrl: null,
      isPublished: false,
      layoutKey: "default",
      seoDescription: null,
      seoTitle: null,
      theme: {},
      verificationToken: null,
    },
    storeId: "store_1",
    tenantId: "tenant_1",
  };
  return { ...settings, ...input };
}
