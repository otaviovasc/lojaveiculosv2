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

  it("shows CRM for read-only WhatsApp users", () => {
    const session = sessionForRole("investor", [
      "crm.whatsapp.list",
      "crm.whatsapp.read",
      "lead.read",
    ]);

    expect(getModulePermission("crm", session).canView).toBe(true);
    expect(
      filterNavigationGroups(navigationGroups, session)
        .flatMap((group) => group.items)
        .some((item) => item.id === "crm"),
    ).toBe(true);
  });

  it("shows the AI operator only with automation read access", () => {
    const allowed = sessionForRole("manager", ["automation.read"]);
    const denied = sessionForRole("salesman", ["inventory.read"]);

    expect(getModulePermission("autobot", allowed).canView).toBe(true);
    expect(getModulePermission("autobot", denied).canView).toBe(false);
    expect(
      filterNavigationGroups(navigationGroups, allowed)
        .flatMap((group) => group.items)
        .some((item) => item.id === "autobot"),
    ).toBe(true);
  });

  it("keeps automatic entries readable without granting management", () => {
    const readOnly = sessionForRole("investor", ["finance.read"]);

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
          effectivePermissions: ["inventory.read", "users.manage"],
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
    expect(getModulePermission("billing", session).canView).toBe(false);
  });

  it("keeps every product module visible for owners without entitlements", () => {
    const session = sessionForRole("owner", [], []);
    const visibleIds = filterNavigationGroups(navigationGroups, session)
      .flatMap((group) => group.items)
      .map((item) => item.id);

    expect(visibleIds).toContain("billing");
    expect(visibleIds).toContain("crm");
    expect(visibleIds).toContain("domain");
    expect(visibleIds).toContain("fiscal");
    expect(visibleIds).toContain("marketplaces");
    expect(visibleIds).toContain("public-api");
    expect(visibleIds).toContain("simulations");
  });

  it("hides only billing from agency-managed store owners", () => {
    const session = sessionForRole("owner", [], []);
    session.defaultStore = {
      ...session.defaultStore!,
      billingManagedBy: "agency",
    };
    const visibleIds = filterNavigationGroups(navigationGroups, session)
      .flatMap((group) => group.items)
      .map((item) => item.id);

    expect(visibleIds).not.toContain("billing");
    expect(visibleIds).toContain("fiscal");
    expect(visibleIds).toContain("marketplaces");
  });

  it("keeps entitlement filtering for operational roles", () => {
    const withoutNfe = sessionForRole("manager", ["fiscal.manage"], []);
    const withNfe = sessionForRole("manager", ["fiscal.manage"], ["nfe"]);

    expect(
      filterNavigationGroups(navigationGroups, withoutNfe)
        .flatMap((group) => group.items)
        .some((item) => item.id === "fiscal"),
    ).toBe(false);
    expect(
      filterNavigationGroups(navigationGroups, withNfe)
        .flatMap((group) => group.items)
        .some((item) => item.id === "fiscal"),
    ).toBe(true);
  });

  it("maps commercial modules to their effective entitlement", () => {
    const locked = sessionForRole("owner", [], []);
    const unlocked = sessionForRole("owner", [], ["custom_domain"]);

    expect(getModuleEntitlement("crm", locked).featureKey).toBe("crm");
    expect(getModuleEntitlement("fiscal", locked).featureKey).toBe("nfe");
    expect(getModuleEntitlement("marketplaces", locked).featureKey).toBe(
      "marketplace",
    );
    expect(getModuleEntitlement("public-api", locked).featureKey).toBe(
      "external_api",
    );
    expect(getModuleEntitlement("simulations", locked).featureKey).toBe(
      "simulations",
    );
    expect(getModuleEntitlement("domain", locked)).toEqual({
      canUse: false,
      featureKey: "custom_domain",
    });
    expect(getModuleEntitlement("domain", unlocked).canUse).toBe(true);
    expect(getModuleEntitlement("checklists", locked).canUse).toBe(true);
    expect(getModuleEntitlement("expenses", locked).canUse).toBe(true);
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
