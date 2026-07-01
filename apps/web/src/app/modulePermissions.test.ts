import { describe, expect, it } from "vitest";
import type { SessionBootstrap } from "../features/account/apiClient";
import {
  filterNavigationGroups,
  getModulePermission,
} from "./modulePermissions";
import { navigationGroups } from "./modules";

describe("module permissions", () => {
  it("keeps settings visible for store managers", () => {
    const session = sessionForRole("owner", [
      "store_profile.manage",
      "store_public_site.manage",
      "users.manage",
    ]);

    expect(getModulePermission("settings", session).canView).toBe(true);
    expect(
      filterNavigationGroups(navigationGroups, session)
        .flatMap((group) => group.items)
        .some((item) => item.id === "settings"),
    ).toBe(true);
  });

  it("hides settings navigation for operational roles", () => {
    const session = sessionForRole("salesman", [
      "crm.access",
      "documents.read",
      "finance.read",
      "inventory.read",
      "lead.read",
      "sale.read",
    ]);

    expect(getModulePermission("settings", session)).toMatchObject({
      canView: false,
      title: "Acesso restrito",
    });
    expect(
      filterNavigationGroups(navigationGroups, session)
        .flatMap((group) => group.items)
        .some((item) => item.id === "settings"),
    ).toBe(false);
  });

  it("filters management modules from the sidebar by effective permission", () => {
    const session = sessionForRole("salesman", [
      "crm.access",
      "documents.read",
      "finance.read",
      "inventory.read",
      "lead.read",
      "sale.read",
    ]);
    const visibleIds = filterNavigationGroups(navigationGroups, session)
      .flatMap((group) => group.items)
      .map((item) => item.id);

    expect(visibleIds).toContain("inventory");
    expect(visibleIds).toContain("sales");
    expect(visibleIds).not.toContain("billing");
    expect(visibleIds).not.toContain("reports");
    expect(visibleIds).not.toContain("settings");
  });
});

function sessionForRole(
  role: string,
  effectivePermissions: readonly string[],
): SessionBootstrap {
  return {
    defaultStore: {
      effectivePermissions,
      role,
      status: "active",
      storeId: "store_1",
      storeName: "Loja Teste",
      storeSlug: "test-store",
      tenantId: "tenant_1",
      tenantName: "Tenant",
    },
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [],
    user: {
      clerkUserId: "clerk",
      email: "user@example.com",
      id: "user_1",
      name: "User",
    },
  };
}
