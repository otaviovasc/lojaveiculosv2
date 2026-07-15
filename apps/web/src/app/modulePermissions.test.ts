// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { SessionBootstrap } from "../features/account/apiClient";
import { persistCurrentStoreSlug } from "../features/account/currentStore";
import {
  filterNavigationGroups,
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

  it("hides entitlement-gated fiscal navigation without nfe access", () => {
    const session = sessionForRole("owner", ["fiscal.manage"], []);
    const visibleIds = filterNavigationGroups(navigationGroups, session)
      .flatMap((group) => group.items)
      .map((item) => item.id);

    expect(getModulePermission("fiscal", session).canView).toBe(true);
    expect(visibleIds).not.toContain("fiscal");
  });

  it("shows entitlement-gated fiscal navigation with nfe access", () => {
    const session = sessionForRole("owner", ["fiscal.manage"], ["nfe"]);
    const visibleIds = filterNavigationGroups(navigationGroups, session)
      .flatMap((group) => group.items)
      .map((item) => item.id);

    expect(visibleIds).toContain("fiscal");
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
