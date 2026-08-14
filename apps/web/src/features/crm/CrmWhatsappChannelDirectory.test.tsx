// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MarketplaceApi } from "../marketplaces/apiClient";
import type { MarketplaceProviderState } from "../marketplaces/types";
import { CrmWhatsappChannelDirectory } from "./CrmWhatsappChannelDirectory";

describe("CrmWhatsappChannelDirectory", () => {
  afterEach(cleanup);

  it("shows independent OLX states and delegates OAuth redirect", async () => {
    const onRedirect = vi.fn();
    render(
      <CrmWhatsappChannelDirectory
        availableProviders={["composio_whatsapp", "zapi"]}
        marketplaceApi={createMarketplaceApi()}
        onChoose={vi.fn()}
        onRedirect={onRedirect}
        zapiAddonContract={null}
      />,
    );

    expect(screen.getByText("Chat")).toBeVisible();
    expect(screen.getByText("Leads")).toBeVisible();
    expect(screen.getByText("Estoque")).toBeVisible();
    fireEvent.click(
      await screen.findByRole("button", { name: "Autorizar OLX" }),
    );
    await waitFor(() =>
      expect(onRedirect).toHaveBeenCalledWith("https://provider.local/oauth"),
    );
  });

  it("does not offer reauthorization for a valid OLX account", async () => {
    render(
      <CrmWhatsappChannelDirectory
        availableProviders={["zapi"]}
        marketplaceApi={createMarketplaceApi(false, createOlxState())}
        onChoose={vi.fn()}
        zapiAddonContract={null}
      />,
    );

    expect(
      await screen.findByText("Webhook de leads confirmado."),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /autorizar OLX/i }),
    ).not.toBeInTheDocument();
  });

  it("offers reauthorization only when a scope is missing", async () => {
    const state = createOlxState();
    if (!state.capabilities) throw new Error("Expected OLX capabilities.");
    state.capabilities.stock = {
      capability: "inventory_sync",
      grantState: "denied",
      reason: "missing_scope",
      status: "blocked",
    };
    render(
      <CrmWhatsappChannelDirectory
        availableProviders={["zapi"]}
        marketplaceApi={createMarketplaceApi(false, state)}
        onChoose={vi.fn()}
        zapiAddonContract={null}
      />,
    );

    expect(
      await screen.findByRole("button", { name: "Reautorizar OLX" }),
    ).toBeVisible();
    expect(screen.getByText(/Escopo ausente/i)).toBeVisible();
  });

  it("announces an indeterminate state when OLX scopes cannot be read", async () => {
    render(
      <CrmWhatsappChannelDirectory
        availableProviders={["zapi"]}
        marketplaceApi={createMarketplaceApi(true)}
        onChoose={vi.fn()}
        zapiAddonContract={null}
      />,
    );

    expect(
      await screen.findByText(/escopos de Leads e Estoque/i),
    ).toHaveTextContent(/Chat mantém o estado observado na conexão do CRM/i);
  });

  it("opens management from an existing Z-API card", () => {
    const onChoose = vi.fn();
    render(
      <CrmWhatsappChannelDirectory
        availableProviders={["zapi"]}
        connections={[createZapiConnection()]}
        marketplaceApi={createMarketplaceApi()}
        onChoose={onChoose}
        zapiAddonContract={null}
      />,
    );

    const zapi = screen.getByRole("button", { name: /Z-API/i });
    expect(zapi).toBeEnabled();
    expect(screen.getByText("Já conectado")).toBeVisible();
    fireEvent.click(zapi);
    expect(onChoose).toHaveBeenCalledWith("zapi");
  });

  it("localizes provider requirement copy instead of exposing raw English", async () => {
    const state = createOlxState();
    state.connectionStatus = "reconnect_required";
    state.requirements = [
      {
        code: "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED",
        message: "Expired credentials.",
        severity: "blocked",
        userAction: "Reconnect the provider account.",
      },
    ];
    render(
      <CrmWhatsappChannelDirectory
        availableProviders={["zapi"]}
        marketplaceApi={createMarketplaceApi(false, state)}
        onChoose={vi.fn()}
        zapiAddonContract={null}
      />,
    );

    expect(await screen.findByText("Reconexão necessária")).toBeVisible();
    expect(screen.queryByText("Expired credentials.")).not.toBeInTheDocument();
  });
});

function createZapiConnection() {
  return {
    credentials: {
      apiBaseUrlEnv: null,
      clientTokenEnv: null,
      instanceIdEnv: null,
      instanceTokenEnv: null,
      mode: "stored" as const,
      storedInstanceConfigured: true,
    },
    displayName: "Z-API principal",
    externalConnectionId: null,
    externalInstanceId: "instance-1",
    id: "connection-1",
    live: {
      checkedAt: "2026-08-12T12:00:00.000Z",
      connected: true,
      connectedPhone: "5511999999999",
      providerStatus: "connected" as const,
      smartphoneConnected: true,
    },
    phone: "5511999999999",
    provider: "zapi" as const,
    ready: true,
    setup: null,
    status: "active" as const,
    webhookUrl: null,
  };
}

function createMarketplaceApi(
  failOverview = false,
  olxState?: MarketplaceProviderState,
): MarketplaceApi {
  return {
    completeConnection: vi.fn(),
    createConnectUrl: vi.fn(async () =>
      Promise.resolve({
        authorizationUrl: "https://provider.local/oauth",
        provider: "olx" as const,
      }),
    ),
    createSyncJob: vi.fn(),
    getOverview: failOverview
      ? vi.fn(async () => Promise.reject(new Error("offline")))
      : vi.fn(async () => ({
          accounts: [],
          jobs: [],
          providerStates: olxState ? [olxState] : [],
          providers: ["olx" as const],
          storeId: "store_1",
          tenantId: "tenant_1",
        })),
    previewStockSync: vi.fn(),
    reconcileSyncJob: vi.fn(),
    retrySyncJob: vi.fn(),
    runSyncJob: vi.fn(),
    runStockSync: vi.fn(),
    upsertAccount: vi.fn(),
  };
}

function createOlxState(): MarketplaceProviderState {
  return {
    accountId: "account_1",
    capabilities: {
      chat: {
        capability: "messaging",
        grantState: "granted",
        reason: null,
        status: "active",
      },
      leads: {
        capability: "lead_ingestion",
        grantState: "granted",
        reason: null,
        status: "active",
      },
      stock: {
        capability: "inventory_sync",
        grantState: "granted",
        reason: null,
        status: "active",
      },
    },
    connectionStatus: "connected",
    lastSyncSummary: null,
    provider: "olx",
    requirements: [],
  };
}
