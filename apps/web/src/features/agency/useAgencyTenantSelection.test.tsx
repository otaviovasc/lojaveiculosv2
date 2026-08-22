// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SessionBootstrap } from "../account/apiClient";
import { AccountSessionProvider } from "../account/accountSession";
import {
  AgencyTenantSelector,
  useAgencyTenantSelection,
} from "./useAgencyTenantSelection";

describe("useAgencyTenantSelection", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("persists the selected agency for the current user", () => {
    const firstRender = renderHarness();

    expect(screen.getByRole("status")).toHaveTextContent("Agência Centro");
    fireEvent.click(
      screen.getByRole("button", { name: "Conta de agência ativa" }),
    );
    fireEvent.click(screen.getByRole("option", { name: "Agência Norte" }));
    expect(screen.getByRole("status")).toHaveTextContent("Agência Norte");

    firstRender.unmount();
    renderHarness();

    expect(screen.getByRole("status")).toHaveTextContent("Agência Norte");
  });

  it("ignores a stored agency that is not active in the session", () => {
    window.localStorage.setItem(
      "lojaveiculosv2:agency-tenant:v1:clerk_agency",
      "tenant_removed",
    );

    renderHarness();

    expect(screen.getByRole("status")).toHaveTextContent("Agência Centro");
  });
});

function renderHarness() {
  return render(
    <AccountSessionProvider session={session()}>
      <SelectionHarness />
    </AccountSessionProvider>,
  );
}

function SelectionHarness() {
  const { agencyTenant, agencyTenants, selectAgencyTenant } =
    useAgencyTenantSelection();
  return (
    <>
      <p role="status">{agencyTenant?.tenantName}</p>
      <AgencyTenantSelector
        agencyTenant={agencyTenant}
        agencyTenants={agencyTenants}
        onChange={selectAgencyTenant}
      />
    </>
  );
}

function session(): SessionBootstrap {
  return {
    defaultStore: null,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [
      {
        role: "agency",
        status: "active",
        tenantId: "tenant_center",
        tenantName: "Agência Centro",
        tenantSlug: "agencia-centro",
      },
      {
        role: "agency",
        status: "active",
        tenantId: "tenant_north",
        tenantName: "Agência Norte",
        tenantSlug: "agencia-norte",
      },
    ],
    user: {
      clerkUserId: "clerk_agency",
      email: "agency@example.test",
      id: "user_agency",
      name: "Operador",
    },
  };
}
