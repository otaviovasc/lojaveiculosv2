// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import type { MarketplaceApi } from "./apiClient";
import { MarketplaceModule } from "./MarketplaceModule";
import type {
  MarketplaceJob,
  MarketplaceOverview,
  MarketplaceStockPlan,
} from "./types";

describe("MarketplaceModule", () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("renders the account requirement checklist", async () => {
    const user = userEvent.setup();
    render(<MarketplaceModule api={createApi()} />);

    await user.click(await screen.findByText("Requisitos do canal"));

    await waitFor(() =>
      expect(screen.getByText("Estado da conta")).toBeVisible(),
    );
    expect(screen.getByRole("img", { name: "Logo OLX" })).toHaveAttribute(
      "src",
      "/images/integrationslogos/olx.png",
    );
    expect(
      screen.getByRole("group", {
        name: "Resumo operacional dos marketplaces",
      }),
    ).toBeVisible();
    expect(screen.getByText("Visão por veículo")).toBeVisible();
    expect(
      screen.getByRole("toolbar", { name: "Ações dos marketplaces" }),
    ).toBeVisible();
    expect(screen.getByText("Conta conectada")).toBeVisible();
    expect(screen.getByText("Conta pronta para sincronizar")).toBeVisible();
    expect(screen.getByText("Nenhuma ação necessária.")).toBeVisible();
  });

  it("lets reconnect-required override an active account", async () => {
    render(
      <MarketplaceModule
        api={createApi({
          getOverview: vi.fn(async () => reconnectRequiredOverview),
        })}
      />,
    );

    const heading = await screen.findByRole("heading", { name: "OLX" });
    const card = heading.closest(".marketplace-card");
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute("data-connection-tone", "danger");
    expect(
      within(card as HTMLElement).getAllByText("Reconexão necessária").length,
    ).toBeGreaterThan(0);
    expect(
      within(card as HTMLElement).getByRole("button", {
        name: "Reconectar conta do OLX",
      }),
    ).toBeEnabled();
    expect(
      within(card as HTMLElement).getByRole("button", {
        name: /Validar lote.*OLX/i,
      }),
    ).toBeEnabled();
    expect(
      within(card as HTMLElement).queryByRole("button", {
        name: /Enviar lote à OLX/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(card as HTMLElement).queryByRole("button", { name: "Ativar" }),
    ).not.toBeInTheDocument();
    expect(
      within(card as HTMLElement).queryByRole("button", { name: "Pausar" }),
    ).not.toBeInTheDocument();
  });

  it("renders preview counts and blocked reasons", async () => {
    const api = createApi();
    const user = userEvent.setup();

    render(<MarketplaceModule api={api} />);

    await user.click(
      await screen.findByRole("button", { name: /Validar lote.*OLX/i }),
    );

    expect(await screen.findByText("Honda Civic EXL")).toBeVisible();
    expect(screen.getByText("BMW 320i")).toBeVisible();
    expect(screen.getByText("Volvo V40 2013")).toBeVisible();
    expect(screen.getByText("Estoque encontrado")).toBeVisible();
    expect(screen.getByText("Prontos para publicar")).toBeVisible();
    expect(screen.getByText("Precisam de correção")).toBeVisible();
    expect(screen.getAllByText("Fora da publicação").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Em processamento").length).toBeGreaterThan(0);
    expect(screen.getByText(/Fotos públicas obrigatórias/i)).toBeVisible();
    expect(
      screen.getByText(/Adicione e selecione fotos públicas/i),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Publicar no site: Volvo V40 2013" }),
    ).toBeEnabled();
  });

  it("keeps send disabled when the preview has no executable decisions", async () => {
    const blockedOnlyPlan: MarketplaceStockPlan = {
      ...plan,
      accounting: {
        excluded: 0,
        found: 1,
        needsCorrection: 1,
        processing: 0,
        ready: 0,
      },
      items: [plan.items[0]!],
      noOp: 0,
      publish: 0,
      total: 1,
    };
    const api = createApi({
      previewStockSync: vi.fn(async () => ({
        batchId: "blocked_batch",
        plan: blockedOnlyPlan,
        provider: "olx" as const,
      })),
    });
    const user = userEvent.setup();
    render(<MarketplaceModule api={api} />);

    await user.click(
      await screen.findByRole("button", { name: /Validar lote.*OLX/i }),
    );

    expect(
      screen.getByRole("button", { name: /Enviar lote à OLX/i }),
    ).toBeDisabled();
  });

  it("runs a stock sync batch from the latest preview", async () => {
    const api = createApi();
    const user = userEvent.setup();

    render(<MarketplaceModule api={api} />);

    await user.click(
      await screen.findByRole("button", { name: /Validar lote.*OLX/i }),
    );
    await user.click(
      await screen.findByRole("button", { name: /Enviar lote à OLX/i }),
    );

    expect(api.runStockSync).toHaveBeenCalledWith("olx", {
      batchId: "batch_1",
      provider: "olx",
    });
    expect(await screen.findByText("Jobs criados")).toBeVisible();
    expect(screen.getByText(/último lote desta sessão/)).toBeVisible();
    expect(screen.queryByText("batch_1")).not.toBeInTheDocument();
  });

  it("retries a failed job", async () => {
    const api = createApi({
      getOverview: vi.fn(async () => ({ ...overview, jobs: [failedJob] })),
    });
    const user = userEvent.setup();

    render(<MarketplaceModule api={api} />);

    await user.click(
      await screen.findByRole("button", { name: /Tentar novamente/i }),
    );

    expect(api.retrySyncJob).toHaveBeenCalledWith("job_failed", {
      reason: "retry_from_marketplace_stock_sync_ui",
    });
    expect(screen.getByText("Publicar anúncio")).toBeVisible();
    expect(screen.getByText("Falhou")).toBeVisible();
    expect(screen.queryByText("listing_1")).not.toBeInTheDocument();
  });

  it("renders friendly marketplace errors with operational context", async () => {
    const api = createApi({
      previewStockSync: vi.fn(async () => {
        throw new AppApiError({
          code: "MARKETPLACE_PROVIDER_RATE_LIMITED",
          details: {
            provider: "olx",
            userAction: "Aguardar 60 segundos.",
            vehicleLabel: "Honda Civic EXL",
          },
          message: "Provider returned 429.",
          requestId: "req_123",
          status: 429,
        });
      }),
    });
    const user = userEvent.setup();

    render(<MarketplaceModule api={api} />);

    await user.click(
      await screen.findByRole("button", { name: /Validar lote.*OLX/i }),
    );

    expect(await screen.findByText("Falha no marketplace")).toBeVisible();
    expect(screen.getByText(/Muitas tentativas em sequencia/)).toBeVisible();
    expect(screen.getByText(/Aguardar 60 segundos\./)).toBeVisible();
    expect(within(screen.getByRole("alert")).getByText(/OLX/)).toBeVisible();
    expect(screen.getByText(/req_123/)).toBeVisible();
  });

  it("explains the different provider contracts", async () => {
    const user = userEvent.setup();
    render(
      <MarketplaceModule
        api={createApi({
          getOverview: vi.fn(async () => bothProvidersOverview),
        })}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText("Catálogo e anúncio por item")).toBeVisible(),
    );
    await waitFor(() =>
      expect(screen.getByText("Autoupload de classificados")).toBeVisible(),
    );
    for (const summary of screen.getAllByText("Requisitos do canal")) {
      await user.click(summary);
    }
    expect(
      screen.getByText("Categoria, marca, modelo, versão e ano"),
    ).toBeVisible();
    expect(screen.getByText("Telefone e CEP da loja")).toBeVisible();
    expect(screen.getByText("Placa válida para veículos usados")).toBeVisible();
  });

  it("completes an OAuth callback and reports that no listing was sent", async () => {
    window.history.replaceState(
      {},
      "",
      "/dashboard?marketplaceOauth=pending&provider=olx&transactionId=11111111-1111-4111-8111-111111111111#/marketplaces",
    );
    const api = createApi();

    render(<MarketplaceModule api={api} />);

    await waitFor(() =>
      expect(api.completeConnection).toHaveBeenCalledWith({
        transactionId: "11111111-1111-4111-8111-111111111111",
      }),
    );
    expect(
      await screen.findByText("OLX conectado. Nenhum anúncio foi enviado."),
    ).toBeVisible();
    expect(window.location.pathname).toBe("/dashboard");
    expect(window.location.hash).toBe("#/marketplaces");
  });

  it("reports partial OLX completion and exposes an explicit retry", async () => {
    window.history.replaceState(
      {},
      "",
      "/dashboard?marketplaceOauth=pending&provider=olx&transactionId=22222222-2222-4222-8222-222222222222#/marketplaces",
    );
    const capabilities = degradedOlxOverview.providerStates[0]?.capabilities;
    if (!capabilities) throw new Error("Expected degraded OLX capabilities.");
    const api = createApi({
      completeConnection: vi.fn(async () => ({
        account,
        capabilities,
        kind: "partial" as const,
      })),
      getOverview: vi.fn(async () => degradedOlxOverview),
    });

    render(<MarketplaceModule api={api} />);

    expect(
      await screen.findByText(/OLX autorizada parcialmente/i),
    ).toBeVisible();
    expect(
      screen.queryByText("OLX conectado. Nenhum anúncio foi enviado."),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Revisar conexão do OLX" }),
    ).toBeEnabled();
  });
});

function createApi(overrides: Partial<MarketplaceApi> = {}): MarketplaceApi {
  const api: MarketplaceApi = {
    completeConnection: vi.fn(async () => ({
      account,
      kind: "connected" as const,
    })),
    createConnectUrl: vi.fn(async () => ({
      authorizationUrl: "https://provider.local/oauth",
      provider: "olx" as const,
    })),
    createSyncJob: vi.fn(async () => failedJob),
    getOverview: vi.fn(async () => overview),
    previewStockSync: vi.fn(async () => ({
      batchId: "batch_1",
      plan,
      provider: "olx" as const,
    })),
    reconcileSyncJob: vi.fn(async () => queuedJob),
    retrySyncJob: vi.fn(async () => ({
      job: { ...failedJob, id: "job_retry", status: "queued" as const },
      previousJobId: failedJob.id,
    })),
    runSyncJob: vi.fn(async () => failedJob),
    runStockSync: vi.fn(async () => ({
      batchId: "batch_1",
      createdJobs: [queuedJob],
      plan,
      provider: "olx" as const,
    })),
    upsertAccount: vi.fn(async () => account),
    ...overrides,
  };
  return api;
}

const account = {
  config: {},
  createdAt: "2026-01-01T00:00:00.000Z",
  id: "account_1",
  provider: "olx" as const,
  status: "active" as const,
  storeId: "store_1",
  tenantId: "tenant_1",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const overview: MarketplaceOverview = {
  accounts: [account],
  jobs: [],
  providerStates: [
    {
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
      requirements: [
        {
          code: "MARKETPLACE_ACCOUNT_NOT_CONNECTED",
          message: "Conta conectada",
          severity: "ok",
          userAction: "Manter credenciais ativas.",
        },
      ],
    },
  ],
  providers: ["olx"],
  storeId: "store_1",
  tenantId: "tenant_1",
};

const reconnectRequiredOverview: MarketplaceOverview = {
  ...overview,
  providerStates: [
    {
      accountId: "account_1",
      capabilities: overview.providerStates[0]?.capabilities ?? null,
      connectionStatus: "reconnect_required",
      lastSyncSummary: null,
      provider: "olx",
      requirements: [
        {
          code: "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED",
          message: "Expired credentials.",
          severity: "blocked",
          userAction: "Reconnect the provider account.",
        },
      ],
    },
  ],
};

const degradedOlxOverview: MarketplaceOverview = {
  ...overview,
  providerStates: [
    {
      accountId: "account_1",
      capabilities: {
        chat: {
          capability: "messaging",
          grantState: "granted",
          reason: "runtime_unavailable",
          status: "error",
        },
        leads: {
          capability: "lead_ingestion",
          grantState: "granted",
          reason: "runtime_unavailable",
          status: "error",
        },
        stock: {
          capability: "inventory_sync",
          grantState: "granted",
          reason: null,
          status: "active",
        },
      },
      connectionStatus: "degraded",
      lastSyncSummary: null,
      provider: "olx",
      requirements: [],
    },
  ],
};

const bothProvidersOverview: MarketplaceOverview = {
  ...overview,
  accounts: [
    account,
    {
      ...account,
      id: "account_ml",
      provider: "mercado_livre",
    },
  ],
  providerStates: [
    ...overview.providerStates,
    {
      accountId: "account_ml",
      capabilities: null,
      connectionStatus: "connected",
      lastSyncSummary: null,
      provider: "mercado_livre",
      requirements: [],
    },
  ],
  providers: ["olx", "mercado_livre"],
};

const plan: MarketplaceStockPlan = {
  accounting: {
    excluded: 1,
    found: 3,
    needsCorrection: 1,
    processing: 0,
    ready: 1,
  },
  blocked: 1,
  items: [
    {
      accountingStatus: "needs_correction",
      blockers: [
        {
          code: "MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS",
          layer: "listing",
          message: "Foto publica obrigatoria.",
          userAction: "Adicionar fotos publicas ao veiculo.",
        },
      ],
      decision: "blocked",
      externalId: null,
      jobType: null,
      listing: {
        catalog: null,
        condition: "used",
        contactPhone: null,
        description: null,
        doors: null,
        fuelType: null,
        isVisibleOnPublicSite: true,
        licensePlate: null,
        listingId: "listing_1",
        locationZipCode: null,
        mediaUrls: [],
        mileageKm: null,
        modelYear: 2020,
        priceCents: 9000000,
        publicSlug: "honda-civic-exl",
        selectedMedia: [],
        selectedUnitId: null,
        status: "published",
        stockLabel: "Honda Civic EXL",
        title: "Honda Civic",
        trimName: "EXL",
        vehicleType: "cars",
      },
      origin: "stock",
      provider: "olx",
      providerMapping: null,
      reason: "O veículo precisa de correções antes de ser enviado ao canal.",
      userAction: null,
    },
    {
      accountingStatus: "ready",
      blockers: [],
      decision: "publish",
      externalId: null,
      jobType: "listing_publish",
      listing: {
        catalog: null,
        condition: "used",
        contactPhone: "5511999999999",
        description: "BMW pronta para publicação.",
        doors: 4,
        fuelType: "gasoline",
        isVisibleOnPublicSite: true,
        licensePlate: "ABC1D23",
        listingId: "listing_2",
        locationZipCode: "01310100",
        mediaUrls: ["https://cdn.local/bmw.jpg"],
        mileageKm: 12000,
        modelYear: 2024,
        priceCents: 25000000,
        publicSlug: "bmw-320i",
        selectedMedia: [
          { altText: "BMW 320i", url: "https://cdn.local/bmw.jpg" },
        ],
        selectedUnitId: "unit_2",
        status: "published",
        stockLabel: "BMW 320i",
        title: "BMW 320i",
        trimName: "Sport",
        vehicleType: "cars",
      },
      origin: "stock",
      provider: "olx",
      providerMapping: null,
      reason: "O veículo está pronto para ser publicado no canal.",
      userAction: "Envie o lote para publicar o anúncio.",
    },
    {
      accountingStatus: "excluded",
      blockers: [],
      decision: "no_op",
      externalId: null,
      jobType: null,
      listing: {
        catalog: null,
        condition: "used",
        contactPhone: null,
        description: null,
        doors: null,
        fuelType: null,
        isVisibleOnPublicSite: false,
        licensePlate: null,
        listingId: "listing_3",
        locationZipCode: null,
        mediaUrls: [],
        mileageKm: null,
        modelYear: 2013,
        priceCents: 8000000,
        publicSlug: "volvo-v40",
        selectedMedia: [],
        selectedUnitId: null,
        status: "published",
        stockLabel: "Volvo V40 2013",
        title: "Volvo V40",
        trimName: null,
        vehicleType: "cars",
      },
      origin: "stock",
      provider: "olx",
      providerMapping: null,
      reason: "O anúncio está privado na vitrine da loja.",
      userAction: "Publique o anúncio e habilite a visibilidade na vitrine.",
    },
  ],
  noOp: 1,
  pending: 0,
  publish: 1,
  total: 3,
  unpublish: 0,
  update: 0,
};

const failedJob: MarketplaceJob = {
  accountId: "account_1",
  completedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  errorMessage: "Falha: preco ausente. Corrigir: preencher preco.",
  id: "job_failed",
  jobType: "listing_publish",
  metadata: { batchId: "batch_1", listingId: "listing_1", stockSync: true },
  provider: "olx",
  status: "failed",
};

const queuedJob: MarketplaceJob = {
  ...failedJob,
  errorMessage: null,
  id: "job_queued",
  status: "queued",
};
