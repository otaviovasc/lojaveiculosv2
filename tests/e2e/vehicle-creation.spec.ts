import { expect, test, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import { accountHeaders, qaPersonas } from "./support/personas";
import {
  expectAccessible,
  expectViewportSafe,
  waitForSettledWorkspace,
} from "./support/uiQuality";
import { setQaViewport } from "./support/viewports";
import { plateLookupResponse } from "./vehicle-creation.fixtures";

const baseURL = process.env.QA_BASE_URL ?? "http://127.0.0.1:5173";

test.use({ baseURL });

test.describe("vehicle creation QA lane", () => {
  test("covers vehicle types, plate and AI autofill, and persists a real draft", async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(120_000);
    const unique = Date.now().toString();
    const plate = `QAT${unique.at(-3)}A${unique.slice(-2)}`;
    const vin = `9BWZZZ377VT${unique.slice(-6)}`;
    const generatedTitle = "Toyota Corolla Altis Premium Hybrid 2024";
    const persistedTitle = `${generatedTitle} QA ${unique.slice(-6)}`;
    const aiDescription =
      "Sedã híbrido de baixo risco, com boa liquidez e histórico revisado pela loja.";
    let createdListingId: string | null = null;
    let plateRequestBody: unknown = null;
    let analysisRequestBody: unknown = null;

    await page.route("**/api/v1/inventory/enrichment/plate", async (route) => {
      plateRequestBody = route.request().postDataJSON();
      await route.fulfill({
        body: JSON.stringify(plateLookupResponse(plate, vin)),
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    await page.route(
      "**/api/v1/inventory/enrichment/resale-analysis",
      async (route) => {
        analysisRequestBody = route.request().postDataJSON();
        await route.fulfill({
          body: JSON.stringify({
            dealRiskScore: 18,
            riskLevel: "low",
            suggestedDescription: aiDescription,
            summary:
              "Boa liquidez esperada para este conjunto de versão e ano.",
            topics: [
              {
                code: "L",
                message: "Demanda consistente no varejo local.",
                title: "Liquidez",
                type: "positive",
              },
            ],
          }),
          headers: { "content-type": "application/json" },
          status: 200,
        });
      },
    );

    try {
      await setQaViewport(page, "desktop");
      await loginAs(page, qaPersonas.owner, testInfo);
      await page.goto("/inventory#/inventory/create");
      await expect(
        page.getByRole("heading", { name: "Cadastrar Veículo" }),
      ).toBeVisible();

      await expectVehicleTypeOptions(page);

      const plateResponsePromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
            "/api/v1/inventory/enrichment/plate" &&
          response.request().method() === "POST",
        { timeout: 20_000 },
      );
      const analysisResponsePromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
            "/api/v1/inventory/enrichment/resale-analysis" &&
          response.request().method() === "POST",
        { timeout: 20_000 },
      );

      await page
        .getByRole("textbox", { name: "Ex: abc1d23" })
        .first()
        .fill(plate);
      await page.getByRole("button", { name: "Consultar placa" }).click();
      await expect((await plateResponsePromise).status()).toBe(200);
      await expect((await analysisResponsePromise).status()).toBe(200);

      await expect(page.getByText("Dados encontrados")).toBeVisible();
      await expect(page.getByLabel("Placa")).toHaveValue(plate);
      await expect(page.getByLabel("Chassi / VIN")).toHaveValue(vin);
      await expect(page.getByLabel("Título de Anúncio")).toHaveValue(
        generatedTitle,
      );
      await expect(page.getByLabel("Descrição Comercial")).toHaveValue(
        aiDescription,
      );
      await expect(page.getByText("Risco Baixo")).toBeVisible();
      await expect(
        page.getByText("Sugestão de Descrição por IA"),
      ).toBeVisible();
      expect(plateRequestBody).toEqual({ plate });
      expect(analysisRequestBody).toMatchObject({
        brand: "Toyota",
        model: "Corolla Altis Premium Hybrid",
        modelYear: 2024,
        plate,
      });

      await page.getByLabel("Título de Anúncio").fill(persistedTitle);
      await page.getByLabel("Número de Estoque").fill(`QA-CREATE-${unique}`);
      await page.getByLabel("Valor de aquisição").fill("125000");
      await page.getByLabel("Valor de venda anunciado").fill("159900");

      await waitForSettledWorkspace(page);
      await expectViewportSafe(page);
      await expectAccessible(page);
      await saveQaScreenshot(page, testInfo, "vehicle-create-ai-desktop");

      await setQaViewport(page, "mobile");
      await expectViewportSafe(page);
      await expectAccessible(page);
      await saveQaScreenshot(page, testInfo, "vehicle-create-ai-mobile");
      await setQaViewport(page, "desktop");

      const listingResponsePromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/v1/inventory/listings" &&
          response.request().method() === "POST",
        { timeout: 20_000 },
      );
      const unitResponsePromise = page.waitForResponse(
        (response) =>
          /\/api\/v1\/inventory\/listings\/[^/]+\/unit$/.test(
            new URL(response.url()).pathname,
          ) && response.request().method() === "PUT",
        { timeout: 20_000 },
      );
      await page.getByRole("button", { name: "Salvar Veículo" }).click();

      const listingResponse = await listingResponsePromise;
      expect(listingResponse.status()).toBe(201);
      const listingPayload = (await listingResponse.json()) as {
        listing: { id: string };
      };
      createdListingId = listingPayload.listing.id;
      expect((await unitResponsePromise).status()).toBe(200);
      await expect(
        page.getByText("Veículo cadastrado com sucesso."),
      ).toBeVisible();
      await saveQaScreenshot(page, testInfo, "vehicle-create-success");

      const persistedResponse = await request.get(
        `/api/v1/inventory/listings/${createdListingId}`,
        { headers: inventoryHeaders() },
      );
      expect(persistedResponse.status()).toBe(200);
      const persisted = (await persistedResponse.json()) as {
        listing: {
          catalog: { vehicleType: string } | null;
          plate: string | null;
          status: string;
          title: string;
        };
        units: Array<{
          plate: string | null;
          stockNumber: string | null;
          vin: string | null;
        }>;
      };
      expect(persisted.listing).toMatchObject({
        catalog: { vehicleType: "cars" },
        plate,
        status: "draft",
        title: persistedTitle,
      });
      expect(persisted.units).toContainEqual(
        expect.objectContaining({
          plate,
          stockNumber: `QA-CREATE-${unique}`,
          vin,
        }),
      );

      await page.goto("/inventory");
      await expect(page.getByText(persistedTitle).first()).toBeVisible();
      await saveQaScreenshot(page, testInfo, "vehicle-create-persisted-list");
    } finally {
      if (createdListingId) {
        const cleanup = await request.delete(
          `/api/v1/inventory/listings/${createdListingId}`,
          { headers: inventoryHeaders() },
        );
        expect(cleanup.status()).toBe(204);
      }
    }
  });
});

async function expectVehicleTypeOptions(page: Page) {
  const typeField = page.locator("label").filter({ hasText: "Tipo" }).first();
  const trigger = typeField.getByRole("button");

  await expect(trigger).toContainText("Carro");
  await trigger.click();
  for (const option of ["Carro", "Moto", "Caminhão"]) {
    await expect(
      page.getByRole("option", { exact: true, name: option }),
    ).toBeVisible();
  }
  await page.getByRole("option", { exact: true, name: "Moto" }).click();
  await expect(trigger).toContainText("Moto");
  await trigger.click();
  await page.getByRole("option", { exact: true, name: "Caminhão" }).click();
  await expect(trigger).toContainText("Caminhão");
  await trigger.click();
  await page.getByRole("option", { exact: true, name: "Carro" }).click();
  await expect(trigger).toContainText("Carro");
}

function inventoryHeaders() {
  return {
    ...accountHeaders(qaPersonas.owner),
    "x-store-slug": qaPersonas.owner.storeSlug ?? "test-store",
  };
}
