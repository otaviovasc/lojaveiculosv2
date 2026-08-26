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
import { AppApiError } from "../../lib/apiErrors";
import type { MarketplaceApi } from "../marketplaces/apiClient";
import type { MarketplaceProviderState } from "../marketplaces/types";
import type { CrmProviderConnection } from "./crmConversationTypes";
import { CrmChannelDirectory } from "./CrmChannelDirectory";

describe("CrmChannelDirectory", () => {
  afterEach(cleanup);

  it("shows independent OLX states and delegates OAuth redirect", async () => {
    const onRedirect = vi.fn();
    render(
      <CrmChannelDirectory
        availableSetups={[
          { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        marketplaceApi={createMarketplaceApi()}
        onChoose={vi.fn()}
        onRedirect={onRedirect}
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
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        marketplaceApi={createMarketplaceApi(false, createOlxState())}
        onChoose={vi.fn()}
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
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        marketplaceApi={createMarketplaceApi(false, state)}
        onChoose={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole("button", { name: "Reautorizar OLX" }),
    ).toBeVisible();
    expect(screen.getByText(/Escopo ausente/i)).toBeVisible();
  });

  it("announces an indeterminate state when OLX scopes cannot be read", async () => {
    render(
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        marketplaceApi={createMarketplaceApi(true)}
        onChoose={vi.fn()}
      />,
    );

    expect(
      await screen.findByText(/escopos de Leads e Estoque/i),
    ).toHaveTextContent(/Chat mantém o estado observado na conexão do CRM/i);
  });

  it("retries an unavailable OLX overview independently of Chat setup", async () => {
    const api = createMarketplaceApi();
    vi.mocked(api.getOverview)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        accounts: [],
        jobs: [],
        providerStates: [createOlxState()],
        providers: ["olx"],
        storeId: "store_1",
        tenantId: "tenant_1",
      });

    render(
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        marketplaceApi={api}
        onChoose={vi.fn()}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Tentar consultar novamente",
      }),
    );

    expect(
      await screen.findByText("Webhook de leads confirmado."),
    ).toBeVisible();
    expect(api.getOverview).toHaveBeenCalledTimes(2);
  });

  it("opens management from an existing Z-API card", () => {
    const onChoose = vi.fn();
    const onManage = vi.fn();
    render(
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        connections={[createZapiConnection()]}
        marketplaceApi={createMarketplaceApi()}
        onChoose={onChoose}
        onManageConnection={onManage}
      />,
    );

    const zapi = screen.getByRole("button", { name: /Z-API principal/i });
    expect(zapi).toBeEnabled();
    expect(screen.queryByText("Já conectado")).not.toBeInTheDocument();
    fireEvent.click(zapi);
    expect(onChoose).not.toHaveBeenCalled();
    expect(onManage).toHaveBeenCalledWith(
      expect.objectContaining({ id: "connection-1", provider: "zapi" }),
    );
  });

  it("opens the existing Z-API repair flow instead of creating another connection", () => {
    const onChoose = vi.fn();
    const onManage = vi.fn();
    const onRepair = vi.fn();
    const disconnected: CrmProviderConnection = {
      ...createZapiConnection(),
      live: {
        ...createZapiConnection().live,
        connected: false,
        providerStatus: "disconnected",
        smartphoneConnected: false,
      },
      ready: false,
      readiness: {
        ready: false,
        reason: "A conexão com o aparelho foi perdida.",
        reasonCode: "disconnected",
      },
      status: "disconnected",
    };

    render(
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        connections={[disconnected]}
        marketplaceApi={createMarketplaceApi()}
        onChoose={onChoose}
        onManageConnection={onManage}
        onRepairConnection={onRepair}
        showRepairActions
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Z-API principal.*Reparar conexão/i,
      }),
    );
    expect(onRepair).toHaveBeenCalledWith(disconnected);
    expect(onChoose).not.toHaveBeenCalled();
    expect(onManage).not.toHaveBeenCalled();
  });

  it("hides duplicate Z-API setup and offers repair for a partial record", () => {
    const onChoose = vi.fn();
    const onRepair = vi.fn();
    const { readiness: _readiness, ...connectionWithoutReadiness } =
      createZapiConnection();
    const partial: CrmProviderConnection = {
      ...connectionWithoutReadiness,
      credentials: {
        ...createZapiConnection().credentials,
        storedInstanceConfigured: false,
      },
      externalInstanceId: null,
      setup: {
        attemptCount: 1,
        configuredAt: null,
        lastErrorCode: "CRM_ZAPI_CREDENTIAL_PARTIAL_STATE",
        requestedAt: "2026-08-12T12:00:00.000Z",
        requiredTypes: [],
        status: "partial",
        succeededTypes: [],
        supportCode: "ZAPI-PARTIAL",
        updatedAt: "2026-08-12T12:00:00.000Z",
        version: 1,
      },
      status: "error",
    };

    render(
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        connections={[partial]}
        onChoose={onChoose}
        onRepairConnection={onRepair}
        showRepairActions
      />,
    );

    expect(screen.getAllByText("Z-API principal")).toHaveLength(1);
    fireEvent.click(
      screen.getByRole("button", {
        name: /Z-API principal.*Reparar conexão/i,
      }),
    );
    expect(onRepair).toHaveBeenCalledWith(partial);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it("keeps configured Instagram Official setup actionable when no new setup is offered", () => {
    const onChoose = vi.fn();
    const instagram = {
      ...createZapiConnection(),
      channel: "instagram" as const,
      displayName: "Instagram da loja",
      id: "instagram-1",
      phone: null,
      provider: "meta_cloud" as const,
    };
    render(
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        connections={[instagram]}
        marketplaceApi={createMarketplaceApi()}
        onChoose={onChoose}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Instagram OficialJá configurado/i,
      }),
    );
    expect(onChoose).toHaveBeenCalledWith("meta_cloud", "instagram");
  });

  it.each([
    ["a channel mismatch", { channel: "instagram" as const }],
    [
      "missing canonical readiness",
      {
        readiness: { ready: false, reason: "Pendente", reasonCode: "pending" },
      },
    ],
    ["an inactive canonical status", { status: "paused" as const }],
  ])("does not mark Z-API configured from %s", (_, override) => {
    render(
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        connections={[{ ...createZapiConnection(), ...override }]}
        marketplaceApi={createMarketplaceApi()}
        onChoose={vi.fn()}
      />,
    );

    expect(screen.queryByText("Já conectado")).not.toBeInTheDocument();
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
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        marketplaceApi={createMarketplaceApi(false, state)}
        onChoose={vi.fn()}
      />,
    );

    expect(await screen.findByText("Reconexão necessária")).toBeVisible();
    expect(screen.queryByText("Expired credentials.")).not.toBeInTheDocument();
  });
});

function createZapiConnection() {
  return {
    channel: "whatsapp" as const,
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
    readiness: { ready: true, reason: null, reasonCode: null },
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

describe("CrmChannelDirectory premium grouping", () => {
  afterEach(cleanup);

  it("groups connected channels under channel-first headings with badges", () => {
    render(
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        connections={[createZapiConnection(), createDefaultOlxConnection()]}
        marketplaceApi={createMarketplaceApi(false, createOlxState())}
        onChoose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "WhatsApp" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Instagram" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "OLX Chat" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Z-API principal")).toBeVisible();
    expect(screen.getAllByText("Padrão")).toHaveLength(1);
    expect(screen.getAllByText("Pronto").length).toBeGreaterThan(0);
  });

  it("opens connection management from a connected channel row", () => {
    const onManageConnection = vi.fn();
    render(
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        connections={[createZapiConnection()]}
        marketplaceApi={createMarketplaceApi()}
        onChoose={vi.fn()}
        onManageConnection={onManageConnection}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Z-API principal/ }));
    expect(onManageConnection).toHaveBeenCalledWith(
      expect.objectContaining({ id: "connection-1" }),
    );
  });

  it("marks an invalid server contract instead of guessing the channel", () => {
    const orphan = {
      ...createZapiConnection(),
      id: "orphan-1",
    };
    delete (orphan as { channel?: unknown }).channel;
    render(
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        connections={[orphan]}
        marketplaceApi={createMarketplaceApi()}
        onChoose={vi.fn()}
      />,
    );

    expect(screen.getByText("Canal não identificado")).toBeInTheDocument();
    expect(screen.getByText("Contrato inválido")).toBeVisible();
  });

  it("retries OLX Chat activation without exposing the provider request id", async () => {
    const state = createOlxState();
    if (!state.capabilities) throw new Error("Expected OLX capabilities.");
    state.capabilities.chat = {
      capability: "messaging",
      grantState: "granted",
      reason: "provider_rejected",
      status: "error",
    };
    const retryOlxChatSetup = vi.fn(async () => ({
      channel: "olx_chat" as const,
      connectionId: "olx-1",
      diagnostics: {
        httpStatus: 200,
        providerRequestId: "op-123",
        retryable: false,
      },
      provider: "olx" as const,
      readiness: { ready: true },
      setup: {
        attemptCount: 2,
        configuredAt: "2026-08-17T12:00:00.000Z",
        status: "configured",
      },
    }));
    const onConnectionsChanged = vi.fn(async () => undefined);
    const olxConnection = {
      ...createZapiConnection(),
      channel: "olx_chat" as const,
      displayName: "OLX principal",
      id: "olx-1",
      provider: "olx" as const,
      ready: false,
      readiness: {
        ready: false,
        reason: "Ativação pendente.",
        reasonCode: "setup_failed",
      },
    };

    render(
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        connections={[olxConnection]}
        crmApi={{ retryOlxChatSetup }}
        marketplaceApi={createMarketplaceApi(false, state)}
        onChoose={vi.fn()}
        onConnectionsChanged={onConnectionsChanged}
      />,
    );

    const retry = await screen.findByRole("button", {
      name: "Tentar ativar Chat novamente",
    });
    expect(
      screen.queryByRole("button", { name: "Reconfigurar OLX" }),
    ).not.toBeInTheDocument();
    fireEvent.click(retry);

    await waitFor(() =>
      expect(retryOlxChatSetup).toHaveBeenCalledWith("olx-1"),
    );
    expect(onConnectionsChanged).toHaveBeenCalledOnce();
    expect(
      await screen.findByText(/OLX Chat está pronto para uso no CRM/i),
    ).toBeVisible();
    expect(screen.queryByText(/op-123/)).not.toBeInTheDocument();
  });

  it("shows the retry error with the request id and no fake success", async () => {
    const state = createOlxState();
    if (!state.capabilities) throw new Error("Expected OLX capabilities.");
    state.capabilities.chat = {
      capability: "messaging",
      grantState: "granted",
      reason: "runtime_unavailable",
      status: "error",
    };
    const retryOlxChatSetup = vi.fn(async () => {
      throw new AppApiError({
        message: "provider exploded",
        requestId: "req-42",
        status: 500,
      });
    });
    const olxConnection = {
      ...createZapiConnection(),
      channel: "olx_chat" as const,
      id: "olx-1",
      provider: "olx" as const,
      ready: false,
      readiness: {
        ready: false,
        reason: "Ativação pendente.",
        reasonCode: "setup_failed",
      },
    };

    render(
      <CrmChannelDirectory
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        connections={[olxConnection]}
        crmApi={{ retryOlxChatSetup }}
        marketplaceApi={createMarketplaceApi(false, state)}
        onChoose={vi.fn()}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Tentar ativar Chat novamente",
      }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Erro interno do servidor/);
    expect(alert).toHaveTextContent(/ID do erro: req-42/);
  });
});

function createDefaultOlxConnection() {
  return {
    ...createZapiConnection(),
    channel: "olx_chat" as const,
    displayName: "OLX principal",
    id: "olx-1",
    isDefault: true,
    provider: "olx" as const,
  };
}
