// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionBootstrap } from "../../account/apiClient";
import { AccountSessionProvider } from "../../account/accountSession";
import type { AgencyApi, AgencyTenantOverview } from "../apiClient";
import type { AgencyCredereApi } from "../credereApiClient";
import { AgencyCrederePage } from "./AgencyCrederePage";

describe("AgencyCrederePage", () => {
  afterEach(cleanup);

  it("keeps the provider APIs untouched when the actor has no agency", async () => {
    const apis = createApis();
    renderPage(apis, session({ agency: false }));

    expect(await screen.findByText("Acesso restrito")).toBeVisible();
    expect(apis.agency.getOverview).not.toHaveBeenCalled();
    expect(apis.credere.getConnection).not.toHaveBeenCalled();
  });

  it("shows the truthful disconnected state and connection action", async () => {
    const apis = createApis({ connected: false });
    renderPage(apis);

    expect(await screen.findByText("Credere não conectado")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Conectar Credere" }),
    ).toBeVisible();
    expect(screen.getByText(/Nenhuma simulação oficial ocorre/i)).toBeVisible();
  });

  it("summarizes the connection and renders flat store mapping rows", async () => {
    const apis = createApis({ connected: true });
    renderPage(apis);

    expect(await screen.findByText("1 de 2")).toBeVisible();
    expect(await screen.findByText("Loja Centro")).toBeVisible();
    expect(screen.getByText("Loja Norte")).toBeVisible();
    expect(screen.getByText("Vinculada")).toBeVisible();
    expect(screen.getByText("Pendente")).toBeVisible();
    expect(screen.queryByText(/ID externo/i)).not.toBeInTheDocument();
  });

  it("offers a retry when the integration overview cannot be loaded", async () => {
    const apis = createApis();
    vi.mocked(apis.credere.getConnection).mockRejectedValueOnce(
      new Error("provider unavailable"),
    );
    renderPage(apis);

    expect(await screen.findByText("Integração indisponível")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeVisible();
  });
});

function renderPage(
  apis: ReturnType<typeof createApis>,
  value: SessionBootstrap = session(),
) {
  return render(
    <AccountSessionProvider session={value}>
      <AgencyCrederePage apiFactory={async () => apis} />
    </AccountSessionProvider>,
  );
}

function createApis({ connected = true }: { connected?: boolean } = {}) {
  const overview = {
    stores: [store("store_1", "Loja Centro"), store("store_2", "Loja Norte")],
  } as unknown as AgencyTenantOverview;
  const agency: AgencyApi = {
    cancelStoreZapiRequest: vi.fn(),
    createCheckout: vi.fn(),
    getOverview: vi.fn(async () => overview),
    getProviderStatus: vi.fn(),
    requestStoreZapi: vi.fn(),
    syncProviderSubscription: vi.fn(),
    updateStoreEntitlement: vi.fn(),
    updateStoreSelection: vi.fn(),
  };
  const credere: AgencyCredereApi = {
    disconnect: vi.fn(async () => undefined),
    getConnection: vi.fn(async () => ({
      configured: connected,
      connected,
      connectedAt: connected ? "2026-08-11T12:00:00.000Z" : null,
      connectionStatus: connected ? "connected" : null,
      mappings: connected
        ? [
            {
              externalStoreAlias: "Credere Centro",
              externalStoreId: "external_1",
              storeId: "store_1",
            },
          ]
        : [],
    })),
    listProviderStores: vi.fn(async () => [
      {
        document: null,
        externalStoreId: "external_1",
        name: "Credere Centro",
        status: "active",
      },
    ]),
    mapStore: vi.fn(async () => undefined),
    startOAuth: vi.fn(async () => ({
      authorizationUrl: "https://credere.example/auth",
    })),
    unmapStore: vi.fn(async () => undefined),
  };
  return { agency, credere };
}

function store(storeId: string, storeName: string) {
  return {
    activeEntitlementCount: 1,
    addonCount: 0,
    createdAt: "2026-08-11T12:00:00.000Z",
    entitlementCount: 1,
    entitlementMatrix: [],
    monthlyAmountCents: 0,
    planCode: null,
    planName: null,
    storeId,
    storeName,
    storeSlug: storeName.toLowerCase().replaceAll(" ", "-"),
    subscriptionStatus: null,
    vehicleCount: 0,
  };
}

function session({
  agency = true,
}: { agency?: boolean } = {}): SessionBootstrap {
  return {
    defaultStore: null,
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: agency
      ? [
          {
            role: "agency",
            status: "active",
            tenantId: "tenant_agency",
            tenantName: "Agência Teste",
            tenantSlug: "agencia-teste",
          },
        ]
      : [],
    user: {
      clerkUserId: "clerk_agency",
      email: "agency@example.test",
      id: "user_agency",
      name: "Operador",
    },
  };
}
