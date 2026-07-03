import { expect, test, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { accountHeaders, qaPersonas } from "./support/personas";
import { setQaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test.describe("Sales QA flow", () => {
  test("validates list filters and a linked sale lifecycle", async ({
    page,
  }, testInfo) => {
    const diagnostics = collectPageDiagnostics(page);

    await setQaViewport(page, "desktop");
    await loginAs(page, qaPersonas.owner, testInfo);
    await page.getByRole("button", { name: "Vendas" }).click();

    await expect(
      page.getByRole("heading", { name: "Workspace de Vendas" }),
    ).toBeVisible();
    await expect(page.getByText("Faturamento recebido")).toBeVisible();
    await expect(page.getByText("R$ 146.500,00").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Toyota Hilux SRX 2021 Carla/ }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Toyota Hilux SRX 2021 Carla/ })
      .click();
    await page
      .locator(".sales-wizard-step")
      .filter({ hasText: "Revisão" })
      .click();
    const closedSaleReview = page
      .locator("div.sales-glass-panel")
      .filter({ hasText: "Composição Financeira" });
    await expect(closedSaleReview).toContainText(
      /Total em Pagamentos\s*R\$\s*146\.500,00/,
    );
    await expect(closedSaleReview).toContainText(/Diferença\s*Quitada/);
    await expect(closedSaleReview).not.toContainText(/restante/i);
    const closedSaleSummary = page.locator(".sales-summary-aside");
    await expect(closedSaleSummary).toContainText(
      /Total Lançado\s*R\$\s*146\.500,00/,
    );
    await expect(closedSaleSummary).not.toContainText("Saldo devedor");
    await saveQaScreenshot(page, testInfo, "05-closed-sale-review");
    await saveQaScreenshot(page, testInfo, "sales-list");

    await page.getByRole("button", { name: "Fechada", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /Toyota Hilux SRX 2021 Carla/ }),
    ).toBeVisible();

    await page
      .getByPlaceholder("Buscar por lead, comprador ou modelo...")
      .fill("sem resultado qa");
    await expect(page.getByText("Nenhuma venda encontrada")).toBeVisible();
    await saveQaScreenshot(page, testInfo, "sales-search-empty");

    const availableSaleContext = await buildAvailableSaleContext(page);
    await page.goto(
      `/dashboard?qa=${Date.now()}#/sales?${availableSaleContext}`,
    );
    await expect(page.getByLabel("Nome do Comprador")).toHaveValue(
      "Cliente QA Sales",
    );
    const sellerPicker = page.getByLabel("Vendedor Responsável");
    const sellerOption = sellerPicker.locator("option").filter({
      hasNotText: "Selecione o vendedor",
    });
    await expect(sellerOption.first()).toBeAttached();
    const sellerOptionValue = await sellerOption.first().getAttribute("value");
    expect(sellerOptionValue).toBeTruthy();
    await sellerPicker.selectOption(sellerOptionValue!);

    await page
      .locator(".sales-wizard-step")
      .filter({ hasText: "Pagamentos" })
      .click();
    await page
      .getByRole("button", { name: "Adicionar Linha de Pagamento" })
      .click();
    await expect(page.getByText("Valor Total Coberto")).toBeVisible();

    await page
      .locator(".sales-wizard-step")
      .filter({ hasText: "Revisão" })
      .click();
    await expect(page.getByText("Total em Pagamentos")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reservar Veículo" }),
    ).toBeEnabled();
    await saveQaScreenshot(page, testInfo, "sales-ready-review");

    const reserveResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/sales/") &&
        response.url().includes("/reserve") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Reservar Veículo" }).click();
    await expect((await reserveResponse).status()).toBe(200);
    await expect(page.getByText("Reserva ativa")).toBeVisible();

    const closeResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/sales/") &&
        response.url().includes("/close") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Fechar Venda" }).click();
    await expect((await closeResponse).status()).toBe(200);
    await expect(page.getByText("Venda fechada")).toBeVisible();

    await setQaViewport(page, "mobile");
    await page.goto("/dashboard#/sales");
    await expect(
      page.getByRole("heading", { name: "Workspace de Vendas" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Abrir Menu" }).click();
    await expect(
      page.getByRole("dialog", { name: "Navegação mobile" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "sales-mobile-menu");

    expectNoPageCrashes(diagnostics);
  });
});

async function buildAvailableSaleContext(page: Page) {
  let item = await loadFirstAvailableSaleUnit(page);
  if (!item) {
    item = await createAvailableSaleUnit(page);
  }
  expect(item, "sales flow requires an available inventory unit").toBeTruthy();
  expect(
    item?.unit,
    "available inventory row should include unit",
  ).toBeTruthy();

  const params = new URLSearchParams({
    buyerEmail: "qa.sales@example.test",
    buyerName: "Cliente QA Sales",
    buyerPhone: "(11) 97777-0000",
    leadId: "20000000-0000-4000-8000-000000000001",
    listingId: item!.listing.id,
    listingTitle: item!.listing.title,
    unitId: item!.unit!.id,
    unitLabel:
      item!.unit!.stockNumber ||
      item!.unit!.plate ||
      item!.unit!.id.slice(0, 8),
  });
  if (item!.listing.priceCents !== null) {
    params.set("priceCents", String(item!.listing.priceCents));
  }
  return params.toString();
}

async function loadFirstAvailableSaleUnit(page: Page) {
  const response = await page.request.get(
    "/api/v1/inventory/units?status=available&limit=20",
    {
      headers: inventoryRequestHeaders(),
    },
  );
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as {
    items: SaleUnitContext[];
  };
  return payload.items.find((candidate) => candidate.unit) ?? null;
}

async function createAvailableSaleUnit(page: Page): Promise<SaleUnitContext> {
  const unique = Date.now();
  const listingResponse = await page.request.post(
    "/api/v1/inventory/listings",
    {
      data: {
        description: "Veiculo criado pelo fluxo QA de vendas.",
        fuelType: "flex",
        mileageKm: 12000,
        modelYear: 2024,
        plate: null,
        priceCents: 18990000,
        status: "published",
        title: `QA Sales Vehicle ${unique}`,
        transmission: "automatic",
      },
      headers: inventoryRequestHeaders(),
    },
  );
  expect(listingResponse.status()).toBe(201);
  const listingPayload = (await listingResponse.json()) as SaleUnitContext;

  const unitResponse = await page.request.put(
    `/api/v1/inventory/listings/${listingPayload.listing.id}/unit`,
    {
      data: {
        colorName: "black",
        plate: null,
        stockNumber: `QA-SALE-${unique}`,
        vin: null,
      },
      headers: inventoryRequestHeaders(),
    },
  );
  expect(unitResponse.ok()).toBe(true);
  const unitPayload = (await unitResponse.json()) as {
    listing: SaleUnitContext["listing"];
    units: NonNullable<SaleUnitContext["unit"]>[];
  };
  const unit = unitPayload.units.at(-1);
  expect(unit, "created sales fixture should include a unit").toBeTruthy();
  return {
    listing: unitPayload.listing,
    unit,
  };
}

function inventoryRequestHeaders() {
  return {
    ...accountHeaders(qaPersonas.owner),
    "x-store-slug": qaPersonas.owner.storeSlug ?? "test-store",
  };
}

type SaleUnitContext = {
  listing: { id: string; priceCents: number | null; title: string };
  unit?: { id: string; plate: string | null; stockNumber: string | null };
};
