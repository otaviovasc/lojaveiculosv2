import { describe, expect, it } from "vitest";
import { adminRoutePaths } from "./adminRoutePaths";
import { isReservedPublicStoreSlug } from "./PublicStorefrontSlugGuard";
import { dashboardStats } from "./dashboardData";
import { publicStorefrontPreview } from "../features/publicSite/fixtures";
import {
  crmSurfaceHash,
  readCrmSurfaceFromHash,
} from "../features/crm/crmRouteState";
import { moduleDefinitions } from "./moduleDefinitions";
import { isPlaceholderModule, moduleSurfaceById } from "./moduleRoutes";
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
    expect(ids).toContain("autobot");
    expect(ids).toContain("settings");
    expect(ids).toContain("public-api");
    expect(ids).toContain("custom-pages");
    expect(ids).not.toContain("compliance");
    expect(ids).not.toContain("internal-health");
  });

  it("keeps every sidebar module classified for rendering", () => {
    const sidebarIds = navigationGroups.flatMap((group) =>
      group.items.map((item) => item.id),
    );

    expect(sidebarIds.every((id) => moduleDefinitions[id])).toBe(true);
    expect(sidebarIds.every((id) => moduleSurfaceById[id])).toBe(true);
    expect(isPlaceholderModule("public-site")).toBe(false);
    expect(isPlaceholderModule("custom-pages")).toBe(false);
    expect(isPlaceholderModule("autobot")).toBe(false);
    expect(isPlaceholderModule("domain")).toBe(true);
  });

  it("parses hash module state without a router dependency", () => {
    expect(parseModuleHash("#inventory")).toBe("inventory");
    expect(parseModuleHash("#/inventory/create")).toBe("inventory");
    expect(parseModuleHash("#/public-api")).toBe("public-api");
    expect(parseModuleHash("#/customize")).toBe("public-site");
    expect(parseModuleHash("#/personalizar")).toBe("public-site");
    expect(parseModuleHash("#/public-site")).toBe("public-site");
    expect(parseModuleHash("#/custom-pages")).toBe("custom-pages");
    expect(parseModuleHash("#/page-builder")).toBe("custom-pages");
    expect(parseModuleHash("#/dominio")).toBe("domain");
    expect(parseModuleHash("#/domain")).toBe("domain");
    expect(parseModuleHash("#/settings?tab=roles")).toBe("settings");
    expect(parseModuleHash("#/crm?surface=leads")).toBe("customers");
    expect(parseModuleHash("#/crm?surface=whatsapp")).toBe("crm");
    expect(parseModuleHash("#unknown")).toBe("dashboard");
  });

  it("parses direct document paths when no valid hash module exists", () => {
    expect(
      parseModuleLocation({ hash: "#unknown", pathname: "/documents" }),
    ).toBe("documents");
    expect(
      parseModuleLocation({ hash: "#unknown", pathname: "/customize" }),
    ).toBe("public-site");
    expect(
      parseModuleLocation({ hash: "#unknown", pathname: "/custom-pages" }),
    ).toBe("custom-pages");
  });

  it("reserves dedicated admin paths before public slug routing", () => {
    expect(adminRoutePaths).toContain("/customers");
    expect(adminRoutePaths).toContain("/customize");
    expect(adminRoutePaths).not.toContain("/personalizar");
    expect(adminRoutePaths).toContain("/custom-pages");
    expect(adminRoutePaths).toContain("/page-builder");
    expect(isReservedPublicStoreSlug("sign-in")).toBe(true);
    expect(isReservedPublicStoreSlug("auth")).toBe(true);
    expect(isReservedPublicStoreSlug("agency")).toBe(true);
    expect(isReservedPublicStoreSlug("platform")).toBe(true);
    expect(isReservedPublicStoreSlug("demo")).toBe(false);
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
