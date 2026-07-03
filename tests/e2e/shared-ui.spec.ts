import { expect, test, type Locator, type Page } from "@playwright/test";
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
      name: "Nenhuma página criada",
    });
    await expect(heading).toBeVisible();
    await expect(
      page.getByText(
        "Crie sua primeira página personalizada para lançamentos, ofertas ou qualquer outro conteúdo.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Criar Primeira Página" }),
    ).toBeVisible();

    const emptyPanel = heading.locator(
      'xpath=ancestor::div[contains(@class, "glass-panel-branded")][1]',
    );
    await expect(emptyPanel).toBeVisible();
    await expect(emptyPanel).toHaveClass(/items-center/);
    await saveQaScreenshot(page, testInfo, "page-builder-empty-state");
  });

  test("keeps storefront media dialogs within the viewport", async ({
    page,
  }, testInfo) => {
    await installLocalSession(page, { permissions: ownerPermissions });
    await setQaViewport(page, "desktop");
    await openHeroGallery(page);

    const gallery = storefrontDialog(page, "Galeria da sua loja");
    await expect(gallery).toBeVisible();
    await expectDialogWithinViewport(page, gallery);
    await expectDialogMinimumWidth(gallery, 900);
    await saveQaScreenshot(page, testInfo, "storefront-gallery-desktop");

    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#2563eb"/></svg>',
      ),
      mimeType: "image/svg+xml",
      name: "qa-storefront-gallery.svg",
    });

    const editor = storefrontDialog(page, "Recortar e ajustar imagem");
    await expect(editor).toBeVisible();
    await expectDialogWithinViewport(page, editor);
    await expectDialogMinimumWidth(editor, 1100);
    await saveQaScreenshot(page, testInfo, "storefront-image-editor-desktop");

    await closeStorefrontDialogs(page);
    await setQaViewport(page, "mobile");
    await openHeroGallery(page);

    const mobileGallery = storefrontDialog(page, "Galeria da sua loja");
    await expect(mobileGallery).toBeVisible();
    await expectDialogWithinViewport(page, mobileGallery);
    await saveQaScreenshot(page, testInfo, "storefront-gallery-mobile");

    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#2563eb"/></svg>',
      ),
      mimeType: "image/svg+xml",
      name: "qa-storefront-gallery-mobile.svg",
    });

    const mobileEditor = storefrontDialog(page, "Recortar e ajustar imagem");
    await expect(mobileEditor).toBeVisible();
    await expectDialogWithinViewport(page, mobileEditor);
    await expectLocatorMaxHeight(
      mobileEditor.getByRole("group", { name: "Formato de corte" }),
      40,
    );
    await mobileEditor.getByLabel("Remover cor selecionada").check();
    const backgroundColorInput = mobileEditor.getByRole("textbox", {
      name: "Cor do fundo",
    });
    await expect(backgroundColorInput).toBeVisible();
    await backgroundColorInput.fill("#22C55E");
    await expect(mobileEditor.getByText("#22C55E")).toBeVisible();
    await saveQaScreenshot(page, testInfo, "storefront-image-editor-mobile");
  });
});

async function gotoQaRoute(page: Page, route: string) {
  const baseUrl = process.env.QA_BASE_URL;
  await page.goto(baseUrl ? new URL(route, baseUrl).toString() : route);
}

async function openHeroGallery(page: Page) {
  await gotoQaRoute(page, "/dashboard#/personalizar");
  const heroButton = page.getByRole("button", { name: /Capa do Site/ });
  const galleryButton = page.getByRole("button", {
    name: "Abrir galeria para Imagem de Fundo",
  });
  await expect(heroButton).toBeVisible();
  if (!(await galleryButton.isVisible())) {
    await heroButton.click();
  }
  await expect(galleryButton).toBeVisible();
  await galleryButton.click();
}

function storefrontDialog(page: Page, title: string) {
  return page.locator('section[role="dialog"]').filter({ hasText: title });
}

async function expectDialogWithinViewport(page: Page, dialog: Locator) {
  const bounds = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!bounds || !viewport) return;

  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectDialogMinimumWidth(dialog: Locator, minimumWidth: number) {
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;
  expect(bounds.width).toBeGreaterThanOrEqual(minimumWidth);
}

async function expectLocatorMaxHeight(locator: Locator, maxHeight: number) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;
  expect(bounds.height).toBeLessThanOrEqual(maxHeight);
}

async function closeStorefrontDialogs(page: Page) {
  for (const title of ["Recortar e ajustar imagem", "Galeria da sua loja"]) {
    const dialog = storefrontDialog(page, title);
    if (await dialog.isVisible()) {
      await dialog.getByRole("button", { name: "Fechar" }).first().click();
      await expect(dialog).toBeHidden();
    }
  }
}
