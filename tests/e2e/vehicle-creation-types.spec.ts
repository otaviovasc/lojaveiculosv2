import { expect, test } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import { accountHeaders, qaPersonas } from "./support/personas";
import { plateLookupResponse } from "./vehicle-creation.fixtures";

const scenarios = [
  {
    brand: "Honda",
    label: "Moto",
    model: "CB 500X",
    type: "motorcycles",
  },
  {
    brand: "Volvo",
    label: "Caminhão",
    model: "FH 540",
    type: "trucks",
  },
] as const;

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

for (const scenario of scenarios) {
  test(`creates and persists a ${scenario.label} with its catalog type`, async ({
    page,
  }, testInfo) => {
    const unique = crypto.randomUUID().replaceAll("-", "").toUpperCase();
    const plate = `QA${scenario.label[0]}${unique[0]}A${unique.slice(1, 3)}`;
    const vin = `9BW${scenario.label[0]}${unique.slice(0, 13)}`;
    const title = `${scenario.brand} ${scenario.model} QA ${unique.slice(0, 8)}`;
    let listingId: string | null = null;

    await page.route("**/api/v1/inventory/enrichment/plate", async (route) => {
      const result = plateLookupResponse(plate, vin);
      result.vehicle.brand = scenario.brand;
      result.vehicle.model = scenario.model;
      result.vehicle.version = scenario.model;
      result.vehicle.vehicleType = scenario.type;
      result.fipe.brandName = scenario.brand;
      result.fipe.modelName = scenario.model;
      await route.fulfill({
        body: JSON.stringify(result),
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    await page.route(
      "**/api/v1/inventory/enrichment/resale-analysis",
      async (route) =>
        route.fulfill({
          body: JSON.stringify({
            dealRiskScore: 25,
            riskLevel: "low",
            suggestedDescription: `${scenario.label} revisada e pronta para venda.`,
            summary: "Boa liquidez para a categoria.",
            topics: [],
          }),
          headers: { "content-type": "application/json" },
          status: 200,
        }),
    );

    try {
      await loginAs(page, qaPersonas.owner, testInfo);
      await page.goto("/inventory#/inventory/create");
      await page
        .getByRole("textbox", { name: "Ex: abc1d23" })
        .first()
        .fill(plate);
      await page.getByRole("button", { name: "Consultar placa" }).click();
      await expect(page.getByText("Dados encontrados")).toBeVisible();
      await expect(page.getByLabel("Descrição Comercial")).toHaveValue(
        new RegExp(`${scenario.label} revisada`, "i"),
      );
      await page.getByLabel("Título de Anúncio").fill(title);
      await page
        .getByLabel("Número de Estoque")
        .fill(`QA-${scenario.type}-${unique}`);
      await page.getByLabel("Valor de aquisição").fill("100000");
      await page.getByLabel("Valor de venda anunciado").fill("125000");

      const listingResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/v1/inventory/listings" &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Salvar Veículo" }).click();
      const response = await listingResponse;
      expect(response.status()).toBe(201);
      listingId = ((await response.json()) as { listing: { id: string } })
        .listing.id;
      await expect(
        page.getByText("Veículo cadastrado com sucesso."),
      ).toBeVisible();

      const persistedResponse = await page.request.get(
        `/api/v1/inventory/listings/${listingId}`,
        { headers: inventoryHeaders() },
      );
      expect(persistedResponse.status()).toBe(200);
      const persisted = (await persistedResponse.json()) as {
        listing: { catalog: { vehicleType: string } | null; title: string };
      };
      expect(persisted.listing).toMatchObject({
        catalog: { vehicleType: scenario.type },
        title,
      });
      await saveQaScreenshot(page, testInfo, `vehicle-create-${scenario.type}`);
    } finally {
      if (listingId) {
        const cleanup = await page.request.delete(
          `/api/v1/inventory/listings/${listingId}`,
          { headers: inventoryHeaders() },
        );
        expect(cleanup.status()).toBe(204);
      }
    }
  });
}

function inventoryHeaders() {
  return {
    ...accountHeaders(qaPersonas.owner),
    "x-store-slug": qaPersonas.owner.storeSlug ?? "test-store",
  };
}
