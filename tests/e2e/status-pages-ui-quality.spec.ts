import { expect, test } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import { qaPersonas } from "./support/personas";
import {
  expectAccessible,
  expectViewportSafe,
  waitForSettledWorkspace,
} from "./support/uiQuality";
import { setQaViewport, type QaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

const viewports = ["desktop", "mobile"] satisfies QaViewport[];

test.describe("status pages UI quality", () => {
  for (const viewport of viewports) {
    test(`unknown URL shows the friendly 404 page (${viewport})`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await setQaViewport(page, viewport);
      await page.goto("/nao-existe/nada");

      await expect(
        page.getByRole("heading", { level: 1, name: "Página não encontrada" }),
      ).toBeVisible();
      await expect(page.getByText("404")).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Voltar para o início/ }),
      ).toBeVisible();

      await expectViewportSafe(page);
      await expectAccessible(page);
      await saveQaScreenshot(page, testInfo, `status-404-${viewport}`);
    });

    test(`unknown store slug shows the storefront not-found state (${viewport})`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await setQaViewport(page, viewport);
      await page.goto("/loja-que-nao-existe");
      await waitForSettledWorkspace(page);

      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Vitrine não encontrada",
        }),
      ).toBeVisible();
      await expect(
        page.getByText(/Não encontramos uma vitrine neste endereço/),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Voltar para o início/ }),
      ).toBeVisible();

      await expectViewportSafe(page);
      await expectAccessible(page);
      await saveQaScreenshot(
        page,
        testInfo,
        `status-storefront-404-${viewport}`,
      );
    });

    test(`storefront failure shows the retryable error state (${viewport})`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await setQaViewport(page, viewport);
      await page.route("**/api/v1/public/storefront/**", async (route) => {
        await route.abort();
      });
      await page.goto("/test-store");
      await waitForSettledWorkspace(page);

      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Vitrine temporariamente indisponível",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Tentar novamente/ }),
      ).toBeVisible();

      await expectViewportSafe(page);
      await expectAccessible(page);
      await saveQaScreenshot(
        page,
        testInfo,
        `status-storefront-error-${viewport}`,
      );
    });
  }

  test("unknown URL no longer boots the admin dashboard for signed-in users", async ({
    page,
  }) => {
    await loginAs(page, qaPersonas.owner);
    await page.goto("/nao-existe/nada");

    await expect(
      page.getByRole("heading", { level: 1, name: "Página não encontrada" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Modulos" }),
    ).not.toBeVisible();
  });
});
