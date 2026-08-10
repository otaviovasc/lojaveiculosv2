import { describe, expect, it } from "vitest";
import { createDrizzlePublicStorefrontRepository } from "./drizzlePublicStorefrontRepository.js";
import { createFakePublicStorefrontDb } from "./drizzlePublicStorefrontRepository.testSupport.js";

describe("Drizzle public storefront contact projection", () => {
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
