import { expect, test, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession } from "./support/auth";
import { setQaViewport } from "./support/viewports";

const ownerPermissions = [
  "inventory.read",
  "inventory.create",
  "store_public_site.manage",
  "users.manage",
];

test.describe("shared UI primitives", () => {
  test("keeps the inventory columns popover within mobile viewport", async ({
    page,
  }, testInfo) => {
    await installLocalSession(page, { permissions: ownerPermissions });
    await setQaViewport(page, "mobile");
    await gotoQaRoute(page, "/inventory");

    await expect(page.getByRole("button", { name: "Colunas" })).toBeVisible();
    await page.getByRole("button", { name: "Colunas" }).click();

    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByText("Dias em Estoque")).toBeVisible();

    const inBodyPortal = await menu.evaluate(
      (node) => node.parentElement === document.body,
    );
    expect(inBodyPortal).toBe(true);

    const bounds = await menu.boundingBox();
    const viewport = page.viewportSize();
    expect(bounds).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (!bounds || !viewport) return;

    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    await saveQaScreenshot(page, testInfo, "inventory-columns-mobile");
  });

  test("uses the shared empty state on custom pages", async ({
    page,
  }, testInfo) => {
    await installLocalSession(page, { permissions: ownerPermissions });
    await setQaViewport(page, "desktop");
    await gotoQaRoute(page, "/page-builder");

    const heading = page.getByRole("heading", {
      name: "Nenhuma pagina criada",
    });
    await expect(heading).toBeVisible();
    await expect(
      page.getByText(
        "Crie sua primeira pagina personalizada para lancamentos, ofertas ou qualquer outro conteudo.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Criar Primeira Pagina" }),
    ).toBeVisible();

    const emptyPanel = heading.locator(
      'xpath=ancestor::div[contains(@class, "glass-panel-branded")][1]',
    );
    await expect(emptyPanel).toBeVisible();
    await expect(emptyPanel).toHaveClass(/items-center/);
    await saveQaScreenshot(page, testInfo, "page-builder-empty-state");
  });
});

async function gotoQaRoute(page: Page, route: string) {
  const baseUrl = process.env.QA_BASE_URL;
  await page.goto(baseUrl ? new URL(route, baseUrl).toString() : route);
}
