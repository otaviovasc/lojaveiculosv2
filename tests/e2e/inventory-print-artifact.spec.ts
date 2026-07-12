import { expect, test, type Page } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { loginAs } from "./support/auth";
import { qaPersonas } from "./support/personas";
import {
  expectAccessible,
  expectViewportSafe,
  waitForSettledWorkspace,
} from "./support/uiQuality";
import { setQaViewport, type QaViewport } from "./support/viewports";

const vehicleTitle = "Audi A4 Prestige Plus 2.0 TFSI 2022";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test.describe("inventory print artifact", () => {
  test("keeps the vehicle sheet human, accessible, and viewport-safe", async ({
    page,
  }, testInfo) => {
    await loginAs(page, qaPersonas.owner);

    for (const viewport of ["desktop", "mobile"] satisfies QaViewport[]) {
      await test.step(viewport, async () => {
        await setQaViewport(page, viewport);
        await page.goto("/inventory");
        await expect(page.getByText(vehicleTitle).first()).toBeVisible();
        await page.getByText(vehicleTitle).first().click();
        await expect(
          page.getByRole("navigation", { name: "Abas do veículo" }),
        ).toBeVisible();

        const trigger = page.getByRole("button", { name: "Imprimir" });
        await trigger.click();

        const dialog = page.getByRole("dialog", {
          name: "Ficha completa do veículo",
        });
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAttribute("aria-modal", "true");
        await expect(
          dialog.getByRole("button", { name: "Imprimir / Salvar PDF" }),
        ).toBeFocused();
        await expect(
          dialog.getByText("Loja Teste", { exact: true }),
        ).toBeVisible();
        await expect(
          dialog.getByText("Publicado", { exact: true }),
        ).toBeVisible();
        await expect(
          dialog.getByText("published", { exact: true }),
        ).toHaveCount(0);
        await expect(
          dialog.getByText("Estoque", { exact: true }),
        ).toBeVisible();
        await expect(
          dialog.getByText("Chassi / VIN", { exact: true }),
        ).toBeVisible();

        await waitForSettledWorkspace(page);
        await expectViewportSafe(page);
        await expectPrintContentSafe(page);
        await expectAccessible(page);

        if (viewport === "desktop") {
          await page.emulateMedia({ media: "print" });
          await expect(page.getByTestId("inventory-print-sheet")).toBeVisible();
          await expect(
            dialog.getByRole("button", { name: "Imprimir / Salvar PDF" }),
          ).toBeHidden();
          await page.emulateMedia({ media: "screen" });
        }

        await saveQaScreenshot(
          page,
          testInfo,
          `inventory-print-sheet-${viewport}`,
        );
        if (viewport === "mobile") {
          await dialog
            .getByText("Chassi / VIN", { exact: true })
            .scrollIntoViewIfNeeded();
          await saveQaScreenshot(
            page,
            testInfo,
            "inventory-print-sheet-mobile-identifiers",
          );
        }

        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(trigger).toBeFocused();
      });
    }
  });
});

async function expectPrintContentSafe(page: Page) {
  const metrics = await page
    .getByTestId("inventory-print-sheet")
    .evaluate((sheet) => {
      const sheetRect = sheet.getBoundingClientRect();
      const overflowing = [...sheet.querySelectorAll<HTMLElement>("*")]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.left < sheetRect.left - 1 || rect.right > sheetRect.right + 1
          );
        })
        .map(
          (element) =>
            element.textContent?.trim().slice(0, 80) ?? element.tagName,
        );

      return {
        clientWidth: sheet.clientWidth,
        overflowing,
        scrollWidth: sheet.scrollWidth,
      };
    });

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.overflowing).toEqual([]);
}
