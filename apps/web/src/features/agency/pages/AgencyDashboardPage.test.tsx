// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionBootstrap } from "../../account/apiClient";
import { AccountSessionProvider } from "../../account/accountSession";
import type { AgencyTenantOverview } from "../apiClient";
import { AgencyDashboardPage } from "./AgencyDashboardPage";

const agencyGetOverview = vi.hoisted(() => vi.fn());

vi.mock("../apiClient", () => ({
  createAgencyApi: () => ({ getOverview: agencyGetOverview }),
}));

vi.mock("../../account/runtimeAuth", () => ({
  createRuntimeActorAuth: vi.fn(() => ({})),
  createRuntimeFetch: vi.fn(() => vi.fn()),
  readClerkToken: vi.fn(async () => "token"),
  readRuntimeApiBaseUrl: vi.fn(() => ({})),
}));

describe("AgencyDashboardPage", () => {
  afterEach(() => {
    cleanup();
    agencyGetOverview.mockReset();
    window.localStorage.clear();
  });

  it("keeps a late response from the previous agency out of the dashboard", async () => {
    const center = deferred<AgencyTenantOverview>();
    const north = deferred<AgencyTenantOverview>();
    agencyGetOverview.mockImplementation((tenantId: string) =>
      tenantId === "tenant_center" ? center.promise : north.promise,
    );
    render(
      <AccountSessionProvider session={session()}>
        <MemoryRouter>
          <AgencyDashboardPage />
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    await waitFor(() =>
      expect(agencyGetOverview).toHaveBeenCalledWith("tenant_center"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Conta de agência ativa" }),
    );
    fireEvent.click(screen.getByRole("option", { name: "Agência Norte" }));
    await waitFor(() =>
      expect(agencyGetOverview).toHaveBeenCalledWith("tenant_north"),
    );

    await act(async () => {
      north.resolve(overview("store_north", "Loja Norte", "tenant_north"));
    });
    expect(await screen.findByText("Loja Norte")).toBeVisible();

    await act(async () => {
      center.resolve(overview("store_center", "Loja Centro", "tenant_center"));
    });
    expect(screen.queryByText("Loja Centro")).not.toBeInTheDocument();
  });

  it("opens CRM for every active same-tenant store owned by the agency", async () => {
    agencyGetOverview.mockResolvedValue(
      overview("store_center", "Loja Centro", "tenant_center"),
    );
    const delegatedSession = session();
    delegatedSession.stores = [
      {
        effectivePermissions: [],
        entitlements: ["crm"],
        role: "agency",
        status: "active",
        storeId: "store_center",
        storeName: "Loja Centro",
        storeSlug: "loja-centro",
        tenantId: "tenant_center",
        tenantName: "Agência Centro",
      },
    ];
    render(
      <AccountSessionProvider session={delegatedSession}>
        <MemoryRouter>
          <AgencyDashboardPage />
          <LocationProbe />
        </MemoryRouter>
      </AccountSessionProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Abrir CRM de Loja Centro" }),
    );

    expect(
      window.localStorage.getItem(
        "lojaveiculosv2:current-store-slug:clerk_agency",
      ),
    ).toBe("loja-centro");
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/dashboard#/crm?surface=conversations",
    );
  });
});

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.hash}
    </output>
  );
}

function overview(
  storeId: string,
  storeName: string,
  tenantId: string,
): AgencyTenantOverview {
  return {
    stores: [
      {
        activeEntitlementCount: 0,
        addonCount: 0,
        createdAt: "2026-08-01T12:00:00.000Z",
        entitlementCount: 0,
        entitlementMatrix: [],
        monthlyAmountCents: 0,
        planCode: null,
        planName: null,
        storeId,
        storeName,
        storeSlug: storeName.toLocaleLowerCase("pt-BR").replaceAll(" ", "-"),
        subscriptionStatus: null,
        vehicleCount: 0,
      },
    ],
    subscription: null,
    tenantId,
  } as unknown as AgencyTenantOverview;
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}
