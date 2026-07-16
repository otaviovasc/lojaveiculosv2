import { expect, test, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import { qaPersonas } from "./support/personas";
import {
  expectAccessible,
  expectViewportSafe,
  waitForSettledWorkspace,
} from "./support/uiQuality";
import { setQaViewport } from "./support/viewports";

const vehicleTitle = "Audi A4 Prestige Plus 2.0 TFSI 2022";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test.describe("inventory post studio", () => {
  test("creates photo-backed posts from list and card views", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await setQaViewport(page, "desktop");
    await loginAs(page, qaPersonas.owner);
    await page.goto("/inventory");
    await expect(page.getByText(vehicleTitle).first()).toBeVisible();

    const listTrigger = page.getByRole("button", {
      name: `Criar post para ${vehicleTitle}`,
    });
    await openStudioWithMedia(page, listTrigger);

    const dialog = page.getByRole("dialog", { name: "Estúdio de posts" });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog.getByText("Feed 1:1", { exact: true })).toBeVisible();
    await expectPhotoBackedCanvas(page, 1080);
    await expectViewportSafe(page);
    await expectAccessible(page);
    await saveQaScreenshot(page, testInfo, "post-studio-list-desktop");

    const adjustmentsButton = dialog.getByRole("button", {
      name: "Enquadramento e fundo",
    });
    await adjustmentsButton.click();
    const zoomSlider = dialog.getByRole("slider", { name: "Zoom da foto" });
    await expect(zoomSlider).toBeVisible();
    await expect(zoomSlider).toHaveValue("1");
    await zoomSlider.fill("1.35");
    await expect(dialog.getByText("1.35x", { exact: true })).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Restaurar Zoom da foto" }),
    ).toBeVisible();
    await expectAccessible(page);
    await saveQaScreenshot(page, testInfo, "post-studio-adjustments-desktop", {
      fullPage: false,
    });
    await dialog
      .getByRole("button", { name: "Restaurar Zoom da foto" })
      .click();
    await expect(zoomSlider).toHaveValue("1");

    await dialog.getByRole("button", { name: "Marca e conteúdo" }).click();
    const priceToggle = dialog.getByRole("checkbox", { name: /^Preço/ });
    await expect(priceToggle).toBeChecked();
    await expect(priceToggle.locator("..")).toHaveAttribute("data-state", "on");
    await priceToggle.locator("..").click();
    await expect(priceToggle).not.toBeChecked();
    await expect(priceToggle.locator("..")).toHaveAttribute(
      "data-state",
      "off",
    );
    await priceToggle.locator("..").click();
    await expect(priceToggle).toBeChecked();

    await dialog.getByRole("button", { name: "Foto com IA (PRO)" }).click();
    const selectedAiTemplate = dialog.getByRole("button", {
      name: /Estúdio Premium/,
    });
    await expect(selectedAiTemplate).toHaveAttribute("aria-pressed", "true");
    await expectAccessible(page);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await page
      .getByRole("button", { name: "Alternar para tema escuro" })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await openStudioWithMedia(page, listTrigger);
    await dialog.getByRole("button", { name: "Foto com IA (PRO)" }).click();
    await expect(selectedAiTemplate).toHaveAttribute("aria-pressed", "true");
    await expectAccessible(page);
    await saveQaScreenshot(page, testInfo, "post-studio-selected-dark", {
      fullPage: false,
    });

    await dialog.getByRole("button", { name: "Layout e formato" }).click();

    const storyButton = dialog.getByRole("button", {
      name: "Stories (9:16)",
    });
    await storyButton.click();
    await expect(storyButton).toHaveAttribute("aria-pressed", "true");
    await expectPhotoBackedCanvas(page, 1920);

    const secondPhoto = dialog.getByRole("button", {
      name: `Usar foto 2 de ${vehicleTitle}`,
    });
    const secondMediaResponse = waitForMediaContent(page);
    await secondPhoto.click();
    expect((await secondMediaResponse).status()).toBe(200);
    await expect(secondPhoto).toHaveAttribute("aria-pressed", "true");
    await expectPhotoBackedCanvas(page, 1920);
    await saveQaScreenshot(page, testInfo, "post-studio-story-desktop");

    const downloadPromise = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Baixar post em PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(
      "audi-a4-prestige-plus-2-0-tfsi-2022-story.png",
    );

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(listTrigger).toBeFocused();

    await page.getByRole("button", { name: "Cards" }).click();
    const cardTrigger = page.getByRole("button", {
      name: `Criar post para ${vehicleTitle}`,
    });
    await openStudioWithMedia(page, cardTrigger);
    await expectPhotoBackedCanvas(page, 1080);
    await saveQaScreenshot(page, testInfo, "post-studio-cards-desktop");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await setQaViewport(page, "mobile");
    await openStudioWithMedia(page, cardTrigger);
    await expectPhotoBackedCanvas(page, 1080);
    await waitForSettledWorkspace(page);
    await expectViewportSafe(page);
    await expectAccessible(page);
    await saveQaScreenshot(page, testInfo, "post-studio-cards-mobile");

    await page.keyboard.press("Escape");
    const noPhotoTrigger = page.getByRole("button", {
      name: /Criar post para Hyundai HB20 Comfort 2021/,
    });
    await noPhotoTrigger.click();
    await expect(
      page.getByRole("heading", {
        name: "Adicione uma foto para criar o post",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Baixar post em PNG" }),
    ).toBeDisabled();
    await expectViewportSafe(page);
    await saveQaScreenshot(page, testInfo, "post-studio-empty-mobile");
  });
});

async function openStudioWithMedia(
  page: Page,
  trigger: ReturnType<Page["getByRole"]>,
) {
  const mediaResponse = waitForMediaContent(page);
  await trigger.click();
  const response = await mediaResponse;
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/");
  await expect(
    page.getByRole("dialog", { name: "Estúdio de posts" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Baixar post em PNG" }),
  ).toBeEnabled();
}

function waitForMediaContent(page: Page) {
  return page.waitForResponse((response) =>
    /\/api\/v1\/inventory\/units\/[^/]+\/media\/[^/]+\/content$/.test(
      new URL(response.url()).pathname,
    ),
  );
}

async function expectPhotoBackedCanvas(page: Page, expectedHeight: number) {
  const canvas = page.getByTestId("post-studio-canvas");
  await expect
    .poll(() => canvas.evaluate((node) => (node as HTMLCanvasElement).height))
    .toBe(expectedHeight);
  await expect
    .poll(() =>
      canvas.evaluate(
        (node) => (node as HTMLCanvasElement).toDataURL("image/png").length,
      ),
    )
    .toBeGreaterThan(150_000);
  await expect
    .poll(() => canvas.evaluate((node) => (node as HTMLCanvasElement).width))
    .toBe(1080);
}
