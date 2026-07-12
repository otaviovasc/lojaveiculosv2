import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { qaPersonas } from "./support/personas";
import {
  expectAccessible,
  expectViewportSafe,
  waitForSettledWorkspace,
} from "./support/uiQuality";
import { setQaViewport } from "./support/viewports";

const vehicleTitle = "Audi A4 Prestige Plus 2.0 TFSI 2022";
const baseURL = process.env.QA_BASE_URL ?? "http://127.0.0.1:5173";
const detailTabs = [
  { artifact: "geral", label: "Geral" },
  { artifact: "financeiro", label: "Financeiro" },
  { artifact: "anuncio", label: "Anúncio" },
  { artifact: "documentos", label: "Documentos" },
  { artifact: "historico", label: "Histórico" },
  { artifact: "vitrine", label: "Vitrine" },
] as const;

test.use({ baseURL });

test.describe("vehicle details QA lane", () => {
  test("contract actions hand off to the canonical Documents workspace", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await openSeedVehicleDetail(page, testInfo, "desktop");
    await page
      .getByRole("navigation", { name: "Abas do veículo" })
      .getByRole("button", { name: "Documentos" })
      .click();

    await expectOfficialDocumentHandoff(page);
    await waitForSettledWorkspace(page);
    await expectViewportSafe(page);
    await expectAccessible(page);
    await saveQaScreenshot(
      page,
      testInfo,
      "admin-detail-documents-canonical-handoff",
    );
  });

  test("seeded owner can inspect every admin vehicle detail tab", async ({
    page,
  }, testInfo) => {
    const diagnostics = collectPageDiagnostics(page);
    const criticalResponses = collectCriticalResponses(page);

    await setQaViewport(page, "desktop");
    await openSeedVehicleDetail(page, testInfo, "desktop");
    await waitForSettledWorkspace(page);
    await expectViewportSafe(page);
    await expectAccessible(page);

    const tabNav = page.getByRole("navigation", { name: "Abas do veículo" });

    for (const tab of detailTabs) {
      const tabButton = tabNav.getByRole("button", { name: tab.label });
      await tabButton.click();
      await expect(tabButton).toHaveAttribute("aria-pressed", "true");
      if (tab.label === "Financeiro") {
        await expectFinanceiroUsesSeededVehicle(page);
      }
      if (tab.label === "Documentos") {
        await expectOfficialDocumentHandoff(page);
      }
      await saveQaScreenshot(
        page,
        testInfo,
        `admin-detail-${tab.artifact}-desktop`,
      );
    }

    await expectNoCriticalResponses(page, criticalResponses);
    expectNoPageCrashes(diagnostics);
  });

  test("admin vehicle detail remains usable on mobile", async ({
    page,
  }, testInfo) => {
    const diagnostics = collectPageDiagnostics(page);
    const criticalResponses = collectCriticalResponses(page);

    await setQaViewport(page, "mobile");
    await openSeedVehicleDetail(page, testInfo, "mobile");
    await expect(page.getByText(vehicleTitle).first()).toBeVisible();
    await waitForSettledWorkspace(page);
    await expectViewportSafe(page);
    await expectAccessible(page);
    await page
      .getByRole("navigation", { name: "Abas do veículo" })
      .getByRole("button", { name: "Vitrine" })
      .click();
    await saveQaScreenshot(page, testInfo, "admin-detail-vitrine-mobile");

    await expectNoCriticalResponses(page, criticalResponses);
    expectNoPageCrashes(diagnostics);
  });

  test("public storefront opens a vehicle detail", async ({
    page,
    request,
  }, testInfo) => {
    const diagnostics = collectPageDiagnostics(page);
    const criticalResponses = collectCriticalResponses(page);
    const publicListingsResponse = await request.get(
      "/api/v1/public/storefront/listings",
      { headers: { "x-store-slug": "test-store" } },
    );
    expect(publicListingsResponse.status()).toBe(200);
    expect(
      (await publicListingsResponse.json()).listings.length,
    ).toBeGreaterThan(0);

    await setQaViewport(page, "desktop");
    await page.goto("/test-store");
    await expect(
      page.getByRole("heading", { name: "Estoque em destaque" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "public-storefront-desktop");

    await openFirstPublicVehicleDetail(page);
    await expect(page.getByText("Tenho interesse").first()).toBeVisible();
    await waitForSettledWorkspace(page);
    await expectViewportSafe(page);
    await expectAccessible(page);
    await saveQaScreenshot(page, testInfo, "public-vehicle-detail-desktop");

    await setQaViewport(page, "mobile");
    await page.goto("/test-store");
    await expect(
      page.getByRole("heading", { name: "Estoque em destaque" }),
    ).toBeVisible();
    await openFirstPublicVehicleDetail(page);
    await expect(page.getByText("Tenho interesse").first()).toBeVisible();
    await waitForSettledWorkspace(page);
    await expectViewportSafe(page);
    await expectAccessible(page);
    await saveQaScreenshot(page, testInfo, "public-vehicle-detail-mobile");

    await expectNoCriticalResponses(page, criticalResponses);
    expectNoPageCrashes(diagnostics);
  });
});

async function openSeedVehicleDetail(
  page: Page,
  testInfo: TestInfo,
  viewport: "desktop" | "mobile",
) {
  await loginAs(page, qaPersonas.owner, testInfo);
  await page.goto("/inventory");
  await expect(page.getByText(vehicleTitle).first()).toBeVisible();
  await saveQaScreenshot(page, testInfo, `admin-inventory-list-${viewport}`);
  await page.getByText(vehicleTitle).first().click();
  await expect(page.getByText(vehicleTitle).first()).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Abas do veículo" }),
  ).toBeVisible();
}

async function openFirstPublicVehicleDetail(page: Page) {
  const publicDetailRequest = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/public/storefront/listings/") &&
      response.status() === 200,
  );
  await page.getByRole("button", { name: "Detalhes" }).first().click();
  await publicDetailRequest;
}

async function expectFinanceiroUsesSeededVehicle(page: Page) {
  const financeiro = page.getByRole("region", {
    name: "Financeiro do veículo",
  });
  await expect(financeiro.getByText("Preço anunciado")).toBeVisible();
  await expect(financeiro.getByText("R$ 189.900").first()).toBeVisible();
  await expect(financeiro.getByText("32.000 km")).toBeVisible();
  await expect(financeiro.getByText("LV-A4-PRETO")).toBeVisible();
  await expect(
    financeiro.getByText("Revisao completa pre-venda").first(),
  ).toBeVisible();
  await expect(financeiro.getByText("R$ 1.850").first()).toBeVisible();

  await expect(financeiro.getByText("R$ 120.000")).toHaveCount(0);
  await expect(financeiro.getByText("R$ 150.000")).toHaveCount(0);
  await expect(financeiro.getByText("R$ 145.000")).toHaveCount(0);
  await expect(financeiro.getByText("R$ 5.000")).toHaveCount(0);
  await expect(financeiro.getByText("32.500 km")).toHaveCount(0);
  await expect(financeiro.getByText("Parachoques")).toHaveCount(0);
  await expect(financeiro.getByText("Laudo Dekra")).toHaveCount(0);
}

async function expectOfficialDocumentHandoff(page: Page) {
  await expect(
    page.getByRole("link", { name: "Abrir Central de documentos" }),
  ).toHaveAttribute("href", "#/documents");
  await expect(
    page.getByText(/Este cadastro não cria minutas locais/i),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /gerar prévia|imprimir contrato/i }),
  ).toHaveCount(0);
}

function collectCriticalResponses(page: Page) {
  const criticalResponses: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 500) {
      criticalResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  return criticalResponses;
}

async function expectNoCriticalResponses(
  page: Page,
  criticalResponses: string[],
) {
  await page.waitForLoadState("networkidle");
  expect(criticalResponses).toEqual([]);
}
