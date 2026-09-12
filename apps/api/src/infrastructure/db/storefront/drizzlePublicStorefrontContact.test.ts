import { storeProfiles } from "@lojaveiculosv2/db";
import { describe, expect, it, vi } from "vitest";
import { createDrizzlePublicStorefrontRepository } from "./drizzlePublicStorefrontRepository.js";
import { createFakePublicStorefrontDb } from "./drizzlePublicStorefrontRepository.testSupport.js";

describe("Drizzle public storefront contact projection", () => {
  it("projects the uploaded profile logo into the public theme", async () => {
    const db = createFakePublicStorefrontDb(
      {},
      {
        logoImageUrl: "https://cdn.local/uploaded-logo.png",
        theme: { logoUrl: "https://cdn.local/old-logo.png" },
      },
    );
    const select = vi.spyOn(db, "select");
    const site =
      await createDrizzlePublicStorefrontRepository(db).findPublicSiteBySlug(
        "demo",
      );
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ logoImageUrl: storeProfiles.logoImageUrl }),
    );
    expect(site?.site.theme.logoUrl).toBe(
      "https://cdn.local/uploaded-logo.png",
    );
  });

  it("keeps a theme logo when the store has no profile logo", async () => {
    const db = createFakePublicStorefrontDb(
      {},
      {
        logoImageUrl: null,
        theme: {
          logoUrl: "https://cdn.local/theme-logo.png",
          accentColor: "blue",
        },
      },
    );
    const site =
      await createDrizzlePublicStorefrontRepository(db).findPublicSiteBySlug(
        "demo",
      );
    expect(site?.site.theme).toEqual({
      logoUrl: "https://cdn.local/theme-logo.png",
      accentColor: "blue",
    });
  });

  it("exposes only the public profile address, hours, and contact fields", async () => {
    const repository = createDrizzlePublicStorefrontRepository(
      createFakePublicStorefrontDb(),
    );

    const site = await repository.findPublicSiteBySlug("demo");

    expect(site?.contact).toEqual({
      addressCity: "Sao Paulo",
      addressLine1: "Avenida Paulista, 1000",
      addressLine2: "Bela Vista",
      addressState: "SP",
      addressZipCode: "01310-100",
      businessHours: {
        monday: { close: "18:00", open: "09:00" },
        saturday: "09:00 - 13:00",
      },
      city: "Sao Paulo",
      contactEmail: "contato@demo.com.br",
      contactPhone: null,
      whatsappPhone: "5511999999999",
      whatsappUrl: "https://wa.me/5511999999999",
    });
    expect(site?.contact).not.toHaveProperty("documentNumber");
  });
});
