import { describe, expect, it } from "vitest";
import { createPublicStorefrontDefaults } from "./drizzleAccountProvisioningDefaults.js";

describe("account provisioning storefront defaults", () => {
  it("publishes every new Quadra storefront with editable content", () => {
    const storefront = createPublicStorefrontDefaults("tenant-1", "store-1");

    expect(storefront.isPublished).toBe(true);
    expect(storefront.layoutKey).toBe("quadra");
    expect(storefront.storeId).toBe("store-1");
    expect(storefront.tenantId).toBe("tenant-1");
    expect(storefront.theme.templateId).toBe("quadra");
    expect(storefront.theme.appearanceMode).toBe("light");
    expect(storefront.theme.heroMediaSource).toBe("vehicles");
    expect(storefront.theme.about.image1_url).toBe(
      "/images/storefront/about-store.webp",
    );
    expect(storefront.theme.about.image2_url).toBe(
      "/images/storefront/about-showroom.webp",
    );
    expect(storefront.theme.contact.title).toBe("Contato");
    expect(storefront.theme.contact.showMap).toBe(true);
    expect(storefront.theme.contact.businessHours.length).toBeGreaterThan(0);
    expect(storefront.theme.contact.description1.length).toBeGreaterThan(0);
    expect(storefront.theme.contact.description2.length).toBeGreaterThan(0);
    expect(
      storefront.theme.sections.some(
        (section) => section.type === "testimonials" && section.visible,
      ),
    ).toBe(true);
    expect(
      storefront.theme.sections.some(
        (section) => section.type === "contact" && section.visible,
      ),
    ).toBe(true);
    expect("testimonials" in storefront.theme).toBe(false);
  });

  it("returns an independent theme for each provisioned storefront", () => {
    const first = createPublicStorefrontDefaults("tenant-1", "store-1");
    const second = createPublicStorefrontDefaults("tenant-2", "store-2");

    expect(first.theme).not.toBe(second.theme);
    expect(first.theme.about).not.toBe(second.theme.about);
  });
});
