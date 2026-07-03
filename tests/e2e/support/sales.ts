import { expect, type Page } from "@playwright/test";
import { accountHeaders, qaPersonas } from "./personas";

export async function createAndDeleteDraft(page: Page) {
  const createResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/sales/drafts") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Nova Venda" }).click();
  await expect((await createResponse).status()).toBe(201);
  await page.getByRole("button", { name: "Voltar" }).first().click();

  const draftCard = page
    .locator("div.sales-glass-panel")
    .filter({ has: page.getByRole("button", { name: "Deletar" }) })
    .first();
  await expect(draftCard).toBeVisible();
  const deleteResponse = page.waitForResponse(
    (response) =>
      /\/api\/v1\/sales\/[^/]+$/.test(new URL(response.url()).pathname) &&
      response.request().method() === "DELETE",
  );
  await draftCard.getByRole("button", { name: "Deletar" }).click();
  await page.getByRole("button", { name: "Excluir Venda" }).click();
  await expect((await deleteResponse).status()).toBe(204);
  await expect(page.getByText("Venda excluída com sucesso")).toBeVisible();
}

export async function buildAvailableSaleContext(page: Page) {
  let item = await loadFirstAvailableSaleUnit(page);
  if (!item?.unit?.plate || !item.unit.colorName) {
    item = await createAvailableSaleUnit(page);
  }
  expect(item, "sales flow requires an available inventory unit").toBeTruthy();
  expect(
    item?.unit,
    "available inventory row should include unit",
  ).toBeTruthy();

  const unit = item!.unit!;
  const colorName = unit.colorName ?? "black";
  const plate = unit.plate ?? unit.id.slice(0, 8);
  const unitLabel = unit.stockNumber || plate;
  const params = new URLSearchParams({
    buyerEmail: "qa.sales@example.test",
    buyerName: "Cliente QA Sales",
    buyerPhone: "(11) 97777-0000",
    colorName,
    leadId: "20000000-0000-4000-8000-000000000001",
    listingId: item!.listing.id,
    listingTitle: item!.listing.title,
    plate,
    unitId: unit.id,
    unitLabel,
  });
  if (item!.primaryMediaUrl) {
    params.set("primaryMediaUrl", item!.primaryMediaUrl);
  }
  if (item!.listing.priceCents !== null) {
    params.set("priceCents", String(item!.listing.priceCents));
  }
  return { colorName, query: params.toString(), unitLabel };
}

export async function selectFirstComboboxOption(page: Page, label: string) {
  const field = page.locator("label").filter({ hasText: label });
  await field.getByRole("button").click();
  await page.locator(".combobox-portal-content button").first().click();
}

export async function fillTradeIn(page: Page, plate: string) {
  await page.getByRole("button", { name: "Troca (Veículo)" }).click();
  await page.getByLabel("Habilitar Troca").check();
  await fillSaleInput(page, "Marca / Fabricante", "Honda");
  await fillSaleInput(page, "Modelo / Versão", "Civic Touring");
  await fillSaleInput(page, "Placa", plate);
  await fillSaleInput(page, "Cor do Veículo", "Preto");
  await fillSaleInput(page, "Ano Fabricação", "2021");
  await fillSaleInput(page, "Ano Modelo", "2022");
  await fillSaleInput(page, "Renavam", "12345678901");
  await fillSaleInput(page, "Chassi", "9BWZZZ377VT004251");
  await fillSaleInput(page, "Valor de Avaliação / Entrada", "8800000");
}

export async function expectAcquiredTradeInUnit(page: Page, plate: string) {
  await expect
    .poll(async () => {
      const response = await page.request.get(
        `/api/v1/inventory/units?status=acquired&search=${plate}`,
        { headers: inventoryRequestHeaders() },
      );
      if (!response.ok()) return "";
      const payload = (await response.json()) as { items: SaleUnitContext[] };
      return payload.items
        .map((item) => `${item.listing.title} ${item.unit?.plate ?? ""}`)
        .join(" ");
    })
    .toContain(`Honda Civic Touring ${plate}`);
}

async function fillSaleInput(page: Page, label: string, value: string) {
  await page
    .locator("label")
    .filter({ hasText: label })
    .locator("input")
    .fill(value);
}

async function loadFirstAvailableSaleUnit(page: Page) {
  const response = await page.request.get(
    "/api/v1/inventory/units?status=available&limit=20",
    { headers: inventoryRequestHeaders() },
  );
  expect(response.ok()).toBe(true);
  const payload = (await response.json()) as { items: SaleUnitContext[] };
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
        plate: `QAS${String(unique).slice(-4)}`,
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
  return { listing: unitPayload.listing, unit };
}

function inventoryRequestHeaders() {
  return {
    ...accountHeaders(qaPersonas.owner),
    "x-store-slug": qaPersonas.owner.storeSlug ?? "test-store",
  };
}

type SaleUnitContext = {
  listing: { id: string; priceCents: number | null; title: string };
  primaryMediaUrl?: string | null;
  unit?: {
    colorName: string | null;
    id: string;
    plate: string | null;
    stockNumber: string | null;
  };
};
