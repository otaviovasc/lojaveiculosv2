import { expect, test, type Page } from "@playwright/test";
import { installLocalSession } from "./support/auth";
import {
  expectNoBlockingAxeViolations,
  expectViewportSafe,
} from "./support/pageChecks";

test("reviews and queues each marketplace through its own contract", async ({
  page,
}) => {
  await installLocalSession(page, {
    permissions: ["marketplace.manage", "marketplace.read"],
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installMarketplaceApi(page);
  await page.goto("/dashboard#/marketplaces");

  await expect(page.getByText("Catálogo e anúncio por item")).toBeVisible();
  await expect(page.getByText("Autoupload de classificados")).toBeVisible();
  await page
    .locator('.marketplace-card[data-provider="olx"]')
    .getByText("Requisitos do canal")
    .click();
  await expect(page.getByText("Telefone e CEP da loja")).toBeVisible();

  await page
    .getByRole("button", { name: "Revisar catálogo no Mercado Livre" })
    .click();
  await expect(page.getByText("Prévia do Mercado Livre pronta.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Prévia e envios" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Enviar ao Mercado Livre" }).click();
  await expect(
    page.getByText(/Lote do Mercado Livre enfileirado/),
  ).toBeVisible();
  await expect(page.getByText("Jobs criados")).toBeVisible();

  await page.setViewportSize({ height: 844, width: 390 });
  await expectViewportSafe(page);
  await expectNoBlockingAxeViolations(page);
});

async function installMarketplaceApi(page: Page) {
  await page.route("**/api/v1/marketplaces/overview", async (route) => {
    await route.fulfill({
      body: JSON.stringify(overview),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route(
    "**/api/v1/marketplaces/integrations/mercado_livre/stock-sync/preview",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          batchId: "batch_marketplace_ui",
          plan,
          provider: "mercado_livre",
        }),
        contentType: "application/json",
        status: 200,
      });
    },
  );
  await page.route(
    "**/api/v1/marketplaces/integrations/mercado_livre/stock-sync/run",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          batchId: "batch_marketplace_ui",
          createdJobs: [queuedJob],
          plan,
          provider: "mercado_livre",
        }),
        contentType: "application/json",
        status: 200,
      });
    },
  );
}

const providers = ["mercado_livre", "olx"] as const;
const accounts = providers.map((provider) => ({
  config: {},
  createdAt: "2026-07-15T12:00:00.000Z",
  id: `account_${provider}`,
  provider,
  status: "active",
  storeId: "store_1",
  tenantId: "tenant_1",
  updatedAt: "2026-07-15T12:00:00.000Z",
}));

const overview = {
  accounts,
  jobs: [],
  providerStates: providers.map((provider) => ({
    accountId: `account_${provider}`,
    connectionStatus: "connected",
    lastSyncSummary: null,
    provider,
    requirements: [],
  })),
  providers,
  storeId: "store_1",
  tenantId: "tenant_1",
};

const plan = {
  blocked: 0,
  items: [],
  noOp: 1,
  publish: 1,
  total: 3,
  unpublish: 0,
  update: 1,
};

const queuedJob = {
  accountId: "account_mercado_livre",
  completedAt: null,
  createdAt: "2026-07-15T12:00:00.000Z",
  errorMessage: null,
  id: "job_marketplace_ui",
  jobType: "listing_publish",
  metadata: { batchId: "batch_marketplace_ui", stockSync: true },
  provider: "mercado_livre",
  status: "queued",
};
