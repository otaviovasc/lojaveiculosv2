// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionBootstrap } from "../../account/apiClient";
import { AccountSessionProvider } from "../../account/accountSession";
import type { InventoryApi } from "../api/apiClient";
import { createInventoryDetailFixture } from "../model/inventoryDetail.testSupport";
import { InventoryDetailWorkspace } from "./InventoryDetailWorkspace";

afterEach(cleanup);

describe("InventoryDetailWorkspace", () => {
  it("uses the shared application content boundary", () => {
    render(
      <InventoryDetailWorkspace
        api={{} as InventoryApi}
        detail={createInventoryDetailFixture()}
        onBack={vi.fn()}
        onUpdated={vi.fn()}
      />,
    );

    expect(screen.getByRole("main")).toHaveClass("dashboard-main");
    expect(screen.getByRole("main")).not.toHaveClass("max-w-7xl");
  });

  it("hides the Vitrine tab when storefront management is not granted", () => {
    render(
      <AccountSessionProvider session={session(["inventory.read"])}>
        <InventoryDetailWorkspace
          api={{} as InventoryApi}
          detail={createInventoryDetailFixture()}
          onBack={vi.fn()}
          onUpdated={vi.fn()}
        />
      </AccountSessionProvider>,
    );

    expect(
      screen.queryByRole("button", { name: "Vitrine" }),
    ).not.toBeInTheDocument();
  });

  it("shows the Vitrine tab when storefront management is granted", () => {
    render(
      <AccountSessionProvider
        session={session(["inventory.read", "store_public_site.manage"])}
      >
        <InventoryDetailWorkspace
          api={{} as InventoryApi}
          detail={createInventoryDetailFixture()}
          onBack={vi.fn()}
          onUpdated={vi.fn()}
        />
      </AccountSessionProvider>,
    );

    expect(screen.getByRole("button", { name: "Vitrine" })).toBeInTheDocument();
  });
});

function session(permissions: readonly string[]): SessionBootstrap {
  const store = {
    effectivePermissions: permissions,
    role: "manager",
    status: "active",
    storeId: "store_1",
    storeName: "Loja Demo",
    storeSlug: "loja-demo",
    tenantId: "tenant_1",
    tenantName: "Tenant Demo",
  } as const;
  return {
    defaultStore: store,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [store],
    tenantMemberships: [],
    user: {
      clerkUserId: "clerk_1",
      email: "manager@example.com",
      id: "user_1",
      name: "Manager",
    },
  };
}
