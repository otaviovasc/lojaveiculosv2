import { expect, test, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import {
  collectPageDiagnostics,
  expectNoPageCrashes,
} from "./support/diagnostics";
import { qaPersonas } from "./support/personas";
import { expectAccessible, expectViewportSafe } from "./support/uiQuality";
import { setQaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test("admin sidebar follows light and dark themes", async ({
  page,
}, testInfo) => {
  const diagnostics = collectPageDiagnostics(page);
  await setQaViewport(page, "desktop");
  await loginAs(page, qaPersonas.owner);
  await ensureTheme(page, "light");

  const sidebar = page.locator(".workspace-sidebar");
  await expect(sidebar).toBeVisible();
  await expect(sidebar).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(sidebar).toHaveCSS("color", "rgb(21, 21, 21)");
  await expect(
    page.locator(".workspace-sidebar__nav-item.is-active"),
  ).toHaveCSS("background-color", "rgb(244, 239, 238)");
  await expectViewportSafe(page);
  await expectAccessible(page);
  await saveQaScreenshot(page, testInfo, "admin-sidebar-light");

  await ensureTheme(page, "dark");
  await expect(sidebar).toHaveCSS("background-color", "rgb(21, 21, 21)");
  await expect(sidebar).toHaveCSS("color", "rgb(244, 239, 238)");
  await saveQaScreenshot(page, testInfo, "admin-sidebar-dark");
  expectNoPageCrashes(diagnostics);
});

async function ensureTheme(page: Page, theme: "dark" | "light") {
  const currentTheme = await page.evaluate(
    () => document.documentElement.dataset.theme,
  );
  if (currentTheme === theme) return;

  await page
    .getByRole("button", {
      name:
        theme === "light"
          ? "Alternar para tema claro"
          : "Alternar para tema escuro",
    })
    .click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
    .toBe(theme);
}
