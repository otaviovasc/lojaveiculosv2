import { describe, expect, it } from "vitest";
import { dashboardStats } from "./dashboardData";
import { publicStorefrontPreview } from "../features/publicSite/fixtures";
import { parseModuleHash } from "./moduleState";
import { navigationGroups } from "./modules";

describe("App module navigation", () => {
  it("starts with core product modules", () => {
    const firstGroup = navigationGroups[0];

    expect(firstGroup?.items.map((item) => item.id)).toEqual([
      "dashboard",
      "inventory",
      "customers",
      "crm",
      "documents",
      "simulations",
    ]);
  });

  it("includes the required foundation modules", () => {
    const ids = navigationGroups.flatMap((group) =>
      group.items.map((item) => item.id),
    );

    expect(ids).toContain("inventory");
    expect(ids).toContain("crm");
    expect(ids).toContain("billing");
    expect(ids).toContain("settings");
    expect(ids).toContain("public-api");
    expect(ids).toContain("internal-health");
  });

  it("parses hash module state without a router dependency", () => {
    expect(parseModuleHash("#inventory")).toBe("inventory");
    expect(parseModuleHash("#/public-api")).toBe("public-api");
    expect(parseModuleHash("#unknown")).toBe("dashboard");
  });

  it("keeps dashboard stats aligned with the Loja visual direction", () => {
    expect(dashboardStats.map((stat) => stat.tone)).toEqual([
      "green",
      "blue",
      "violet",
      "pink",
    ]);
  });

  it("keeps public storefront preview aligned with subdomain routing", () => {
    expect(publicStorefrontPreview.store.slug).toBe("demo");
    expect(
      publicStorefrontPreview.listings.every((listing) => listing.slug),
    ).toBe(true);
  });
});
