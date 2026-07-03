import { expect, test } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { accountHeaders, qaPersonas } from "./support/personas";
import { setQaViewport } from "./support/viewports";

test.use({
  baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173",
});

test.describe("customize and page builder QA lane", () => {
  test("saves storefront settings and publishes a custom page", async ({
    page,
    request,
  }, testInfo) => {
    const diagnostics = collectPageDiagnostics(page);
    const unique = Date.now().toString(36);
    const pageTitle = `QA Builder ${unique}`;
    const pageSlug = `qa-builder-${unique}`;
    const headline = `QA vitrine integrada ${unique}`;
    const headers = accountHeaders(qaPersonas.owner);
    let createdPageId: string | null = null;

    const originalSettingsResponse = await request.get(
      "/api/v1/settings/store",
      { headers },
    );
    expect(originalSettingsResponse.status()).toBe(200);
    const originalSettings = await originalSettingsResponse.json();

    try {
      await setQaViewport(page, "desktop");
      await loginAs(page, qaPersonas.owner, testInfo);

      await page.goto("/dashboard#/personalizar");
      await expect(
        page.getByRole("heading", { name: "Personalizar" }),
      ).toBeVisible();
      await page.getByRole("button", { name: /Capa do Site/ }).click();
      await page.getByLabel("Título de Impacto").fill(headline);
      await page.getByRole("button", { name: /^Salvar/ }).click();
      await expect(page.getByText("Salvo com sucesso!")).toBeVisible();
      await saveQaScreenshot(page, testInfo, "customize-saved-desktop");

      await page.goto("/test-store");
      await expect(page.getByText(headline)).toBeVisible();
      await saveQaScreenshot(page, testInfo, "public-storefront-updated");

      await page.goto("/dashboard#/custom-pages");
      await expect(
        page.getByRole("heading", { name: "Páginas Personalizadas" }),
      ).toBeVisible();
      await saveQaScreenshot(page, testInfo, "custom-pages-list-desktop");

      await page.getByRole("button", { name: /Nova Página/ }).click();
      await page.getByLabel("Nome da Página").fill(pageTitle);
      await expect(page.getByLabel("URL")).toHaveValue(pageSlug);
      await page
        .getByLabel("Descrição")
        .fill("Página criada pela validação local do page builder.");
      await page.getByRole("button", { name: "Criar Página" }).click();
      await expect(
        page.getByRole("heading", { name: pageTitle }),
      ).toBeVisible();

      const listResponse = await request.get("/api/v1/storefront/pages", {
        headers,
      });
      expect(listResponse.status()).toBe(200);
      const listPayload = await listResponse.json();
      createdPageId =
        listPayload.pages.find(
          (customPage: { slug: string }) => customPage.slug === pageSlug,
        )?.id ?? null;

      await page.getByRole("button", { name: /Hero/ }).first().click();
      await expect(page.getByText("Blocos da página")).toBeVisible();
      await page.getByRole("button", { name: /^Salvar/ }).click();
      await expect(page.getByText("Salvo com sucesso!")).toBeVisible();
      await page.getByRole("button", { name: "Rascunho" }).click();
      await expect(
        page.getByRole("button", { name: "Publicado" }),
      ).toBeVisible();
      await saveQaScreenshot(page, testInfo, "custom-page-published-desktop");

      await page.goto(`/test-store/p/${pageSlug}`);
      await expect(
        page.getByText("Encontre seu próximo veículo com confiança"),
      ).toBeVisible();
      await saveQaScreenshot(page, testInfo, "public-custom-page-desktop");

      await setQaViewport(page, "mobile");
      await page.goto(`/test-store/p/${pageSlug}`);
      await expect(
        page.getByText("Encontre seu próximo veículo com confiança"),
      ).toBeVisible();
      await expect(page.locator("html")).toHaveJSProperty("clientWidth", 390);
      await saveQaScreenshot(page, testInfo, "public-custom-page-mobile");

      expectNoPageCrashes(diagnostics);
    } finally {
      if (createdPageId) {
        await request.delete(`/api/v1/storefront/pages/${createdPageId}`, {
          headers,
        });
      }
      await request.patch("/api/v1/settings/store", {
        data: {
          publicSite: {
            heroImageUrl: originalSettings.publicSite.heroImageUrl,
            isPublished: originalSettings.publicSite.isPublished,
            layoutKey: originalSettings.publicSite.layoutKey,
            seoDescription: originalSettings.publicSite.seoDescription,
            seoTitle: originalSettings.publicSite.seoTitle,
            theme: originalSettings.publicSite.theme,
          },
        },
        headers,
      });
    }
  });
});
