import { describe, expect, it } from "vitest";
import { dashboardStats } from "./dashboardData";
import { publicStorefrontPreview } from "../features/publicSite/fixtures";
import {
  crmSurfaceHash,
  readCrmSurfaceFromHash,
} from "../features/crm/crmRouteState";
import { parseModuleHash, parseModuleLocation } from "./moduleState";
import { navigationGroups } from "./modules";

describe("App module navigation", () => {
  it("starts with core product modules", () => {
    const firstGroup = navigationGroups[0];

    expect(firstGroup?.items.map((item) => item.id)).toEqual([
      "dashboard",
      "inventory",
      "sales",
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
    expect(ids).not.toContain("compliance");
    expect(ids).not.toContain("internal-health");
  });

  it("parses hash module state without a router dependency", () => {
    expect(parseModuleHash("#inventory")).toBe("inventory");
    expect(parseModuleHash("#/inventory/create")).toBe("inventory");
    expect(parseModuleHash("#/public-api")).toBe("public-api");
    expect(parseModuleHash("#/settings?tab=roles")).toBe("settings");
    expect(parseModuleHash("#/crm?surface=leads")).toBe("customers");
    expect(parseModuleHash("#/crm?surface=whatsapp")).toBe("crm");
    expect(parseModuleHash("#unknown")).toBe("dashboard");
  });

  it("parses direct document paths when no valid hash module exists", () => {
    expect(
      parseModuleLocation({ hash: "#unknown", pathname: "/documents" }),
    ).toBe("documents");
  });

  it("keeps CRM surfaces deterministic for visual QA routes", () => {
    expect(crmSurfaceHash("leads")).toBe("/crm?surface=leads");
    expect(crmSurfaceHash("whatsapp")).toBe("/crm?surface=whatsapp");
    expect(readCrmSurfaceFromHash("#/crm?surface=leads")).toBe("leads");
    expect(readCrmSurfaceFromHash("#/crm?surface=whatsapp")).toBe("whatsapp");
    expect(readCrmSurfaceFromHash("#/crm")).toBe("whatsapp");
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
