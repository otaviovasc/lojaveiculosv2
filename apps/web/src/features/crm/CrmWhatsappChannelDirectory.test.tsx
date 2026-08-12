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
});

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
