// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { SessionBootstrap } from "../features/account/apiClient";
import { persistCurrentStoreSlug } from "../features/account/currentStore";
import {
  filterNavigationGroups,
  getModuleEntitlement,
  getModulePermission,
} from "./modulePermissions";
import { navigationGroups } from "./modules";

describe("module permissions", () => {
  afterEach(() => {
    localStorage.clear();
  });

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
    const session = sessionForRole(
      "salesman",
      [
        "crm.access",
        "documents.read",
        "finance.read",
        "inventory.read",
        "lead.read",
        "sale.read",
      ],
      ["inventory", "sales"],
    );

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
    const session = sessionForRole(
      "salesman",
      [
        "crm.access",
        "documents.read",
        "finance.read",
        "inventory.read",
        "lead.read",
        "sale.read",
      ],
      ["inventory", "sales"],
    );
    const visibleIds = filterNavigationGroups(navigationGroups, session)
      .flatMap((group) => group.items)
      .map((item) => item.id);

    expect(visibleIds).toContain("inventory");
    expect(visibleIds).toContain("sales");
    expect(visibleIds).not.toContain("billing");
    expect(visibleIds).not.toContain("reports");
    expect(visibleIds).not.toContain("settings");
  });

  it("shows CRM for read-only WhatsApp users", () => {
    const session = sessionForRole(
      "investor",
      ["crm.conversations.read", "lead.read"],
      ["crm"],
    );

    expect(getModulePermission("crm", session).canView).toBe(true);
    expect(
      filterNavigationGroups(navigationGroups, session)
        .flatMap((group) => group.items)
        .some((item) => item.id === "crm"),
    ).toBe(true);
  });

  it("keeps automatic entries readable without granting management", () => {
    const readOnly = sessionForRole("investor", ["finance.read"], ["finance"]);

    expect(getModulePermission("auto-entries", readOnly).canView).toBe(true);
    expect(
      filterNavigationGroups(navigationGroups, readOnly)
        .flatMap((group) => group.items)
        .some((item) => item.id === "auto-entries"),
    ).toBe(true);
  });

  it("uses the selected active store when an agency session has no default store", () => {
    persistCurrentStoreSlug("agency-store", "clerk");
    const session = {
      ...sessionForRole("owner", []),
      defaultStore: null,
      stores: [
        {
          effectivePermissions: [
            "billing.manage",
            "crm.access",
            "external_api.manage",
            "fiscal.manage",
            "financing.simulation.read",
            "inventory.read",
            "sale.read",
          ],
          entitlements: ["crm", "external_api", "financing", "fiscal"],
          role: "agency",
          status: "active" as const,
          storeId: "store_agency",
          storeName: "Loja da Agencia",
          storeSlug: "agency-store",
          tenantId: "tenant_agency",
          tenantName: "Agencia",
        },
      ],
      tenantMemberships: [
        {
          role: "agency",
          status: "active" as const,
          tenantId: "tenant_agency",
          tenantName: "Agencia",
          tenantSlug: "agencia",
        },
      ],
    };

    expect(getModulePermission("inventory", session).canView).toBe(true);
    expect(getModulePermission("billing", session).canView).toBe(true);
    expect(getModulePermission("crm", session).canView).toBe(true);
    expect(getModulePermission("fiscal", session).canView).toBe(true);
    expect(getModulePermission("public-api", session).canView).toBe(true);
    expect(getModulePermission("simulations", session).canView).toBe(true);
  });

  it("keeps authorized commercial modules visible and locked for owners", () => {
    const session = sessionForRole(
      "owner",
      [
        "billing.manage",
        "crm.access",
        "fiscal.manage",
        "marketplace.read",
        "external_api.manage",
        "sale.read",
      ],
      [],
    );
    const visibleIds = filterNavigationGroups(navigationGroups, session)
      .flatMap((group) => group.items)
      .map((item) => item.id);

    expect(visibleIds).toContain("billing");
    expect(visibleIds).toContain("crm");
    expect(visibleIds).toContain("fiscal");
    expect(visibleIds).toContain("marketplaces");
    expect(visibleIds).toContain("public-api");
    expect(getModuleEntitlement("crm", session).canUse).toBe(false);
  });

  it("keeps billing permission-driven for agency-managed store owners", () => {
    const session = sessionForRole("owner", ["billing.manage"], []);
    session.defaultStore = {
      ...session.defaultStore!,
      billingManagedBy: "agency",
    };
    const visibleIds = filterNavigationGroups(navigationGroups, session)
      .flatMap((group) => group.items)
      .map((item) => item.id);

    expect(visibleIds).toContain("billing");
    expect(visibleIds).not.toContain("fiscal");
    expect(visibleIds).not.toContain("marketplaces");
  });

  it("keeps entitled and locked modules visible for authorized operational roles", () => {
    const withoutFiscal = sessionForRole("manager", ["fiscal.manage"], []);
    const withFiscal = sessionForRole("manager", ["fiscal.manage"], ["fiscal"]);

    expect(
      filterNavigationGroups(navigationGroups, withoutFiscal)
        .flatMap((group) => group.items)
        .some((item) => item.id === "fiscal"),
    ).toBe(true);
    expect(getModuleEntitlement("fiscal", withoutFiscal).canUse).toBe(false);
    expect(
      filterNavigationGroups(navigationGroups, withFiscal)
        .flatMap((group) => group.items)
        .some((item) => item.id === "fiscal"),
    ).toBe(true);
  });

  it("maps commercial modules to their effective entitlement", () => {
    const locked = sessionForRole("owner", [], []);

    expect(getModuleEntitlement("crm", locked).featureKey).toBe("crm");
    expect(getModuleEntitlement("fiscal", locked).featureKey).toBe("fiscal");
    expect(getModuleEntitlement("marketplaces", locked).featureKey).toBe(
      "marketplace",
    );
    expect(getModuleEntitlement("public-api", locked).featureKey).toBe(
      "external_api",
    );
    expect(getModuleEntitlement("simulations", locked).featureKey).toBe(
      "financing",
    );
    expect(getModuleEntitlement("paid-traffic", locked).featureKey).toBe(
      "analytics",
    );
    expect(getModuleEntitlement("checklists", locked).canUse).toBe(false);
    expect(getModuleEntitlement("expenses", locked).canUse).toBe(false);
  });

  it("keeps financing simulation permission independent from sales", () => {
    const seller = sessionForRole(
      "salesman",
      ["sale.read"],
      ["financing", "sales"],
    );
    const financingReader = sessionForRole(
      "salesman",
      ["financing.simulation.read"],
      ["financing"],
    );

    expect(getModulePermission("simulations", seller).canView).toBe(false);
    expect(getModulePermission("simulations", financingReader).canView).toBe(
      true,
    );
  });

  it("fails closed while permission or entitlement state is unavailable", () => {
    const session = sessionForRole("owner", ["crm.access"]);

    expect(getModuleEntitlement("crm", session).canUse).toBe(false);
    expect(filterNavigationGroups(navigationGroups, null)).toEqual([]);
  });
});

function sessionForRole(
  role: string,
  effectivePermissions: readonly string[],
  entitlements?: readonly string[],
): SessionBootstrap {
  return {
    defaultStore: {
      effectivePermissions,
      ...(entitlements === undefined ? {} : { entitlements }),
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
