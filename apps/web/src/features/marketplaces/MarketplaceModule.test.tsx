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
  afterEach(cleanup);

  it("renders the account requirement checklist", async () => {
    render(<MarketplaceModule api={createApi()} />);

    expect(await screen.findByText("Checklist da conta")).toBeVisible();
    expect(screen.getByRole("img", { name: "Logo OLX" })).toHaveAttribute(
      "src",
      "/images/integrationslogos/olx.png",
    );
    expect(
      screen.getByRole("region", {
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
    expect(card?.querySelector(".marketplace-connection-status")).toHaveClass(
      "is-danger",
    );
    expect(
      within(card as HTMLElement).getByRole("button", {
        name: "Reconectar conta",
      }),
    ).toBeEnabled();
    expect(
      within(card as HTMLElement).getByRole("button", {
        name: /Prever estoque/i,
      }),
    ).toBeDisabled();
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

    await user.click(await screen.findByRole("button", { name: /Prever/i }));

    expect(await screen.findByText("Honda Civic EXL")).toBeVisible();
    expect(screen.getByText("Publicar")).toBeVisible();
    expect(screen.getByText("Bloqueados")).toBeVisible();
    expect(screen.getByText(/Fotos públicas obrigatórias/i)).toBeVisible();
    expect(
      screen.getByText(/Adicione e selecione fotos públicas/i),
    ).toBeVisible();
  });

  it("runs a stock sync batch from the latest preview", async () => {
    const api = createApi();
    const user = userEvent.setup();

    render(<MarketplaceModule api={api} />);

    await user.click(await screen.findByRole("button", { name: /Prever/i }));
    await user.click(
      await screen.findByRole("button", { name: /Enfileirar/i }),
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
    expect(screen.getByText(/Publicar anúncio · Falhou/)).toBeVisible();
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

    await user.click(await screen.findByRole("button", { name: /Prever/i }));

    expect(await screen.findByText("Falha no marketplace")).toBeVisible();
    expect(screen.getByText(/Muitas tentativas em sequencia/)).toBeVisible();
    expect(screen.getByText("Aguardar 60 segundos.")).toBeVisible();
    expect(within(screen.getByRole("alert")).getByText("OLX")).toBeVisible();
    expect(screen.getByText("Honda Civic EXL")).toBeVisible();
    expect(screen.getByText("req_123")).toBeVisible();
  });
});

function createApi(overrides: Partial<MarketplaceApi> = {}): MarketplaceApi {
  const api: MarketplaceApi = {
    completeConnection: vi.fn(async () => account),
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

const plan: MarketplaceStockPlan = {
  blocked: 1,
  items: [
    {
      blockers: [
        {
          code: "MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS",
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
      provider: "olx",
    },
  ],
  noOp: 0,
  publish: 2,
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
