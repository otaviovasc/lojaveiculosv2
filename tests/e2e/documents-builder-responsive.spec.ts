import { expect, test } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession } from "./support/auth";
import {
  expectNoBlockingAxeViolations,
  expectViewportSafe,
} from "./support/pageChecks";
import { qaPersonas } from "./support/personas";
import { setQaViewport } from "./support/viewports";

const documentPermissions = [
  "documents.download",
  "documents.preview",
  "documents.read",
  "documents.upload",
  "documents.void",
  "inventory.read",
];

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test("keeps document model authoring usable across viewports", async ({
  page,
}, testInfo) => {
  await installLocalSession(page, {
    permissions: documentPermissions,
    persona: qaPersonas.owner,
  });

  for (const viewport of ["desktop", "mobile"] as const) {
    await setQaViewport(page, viewport);
    await page.goto("/documents");
    const sectionNavigation = page.getByRole("navigation", {
      name: "Seções de documentos",
    });
    const templatesButton = sectionNavigation.getByRole("button", {
      name: /^Modelos\b/,
    });
    await expect(sectionNavigation).toBeVisible();
    await expect(templatesButton).toBeVisible();
    await templatesButton.click();
    await expect(templatesButton).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".documents-builder-layout")).toBeVisible();
    await saveQaScreenshot(page, testInfo, `documents-builder-${viewport}`);
    await expectViewportSafe(page);

    const sidebar = page.getByRole("complementary", {
      name: "Biblioteca de modelos",
    });
    const createTemplateButton = sidebar.getByRole("button", {
      name: "Novo modelo",
    });
    await expect(createTemplateButton).toBeVisible();

    if (viewport === "desktop") {
      const templateList = page.locator(".documents-builder-template-list");
      const scrollMetrics = await templateList.evaluate((list) => {
        const firstTemplate = list.firstElementChild;
        for (let index = 0; index < 30; index += 1) {
          if (firstTemplate) {
            list.append(firstTemplate.cloneNode(true));
          }
        }

        return {
          clientHeight: list.clientHeight,
          overflowY: getComputedStyle(list).overflowY,
          scrollHeight: list.scrollHeight,
        };
      });

      expect(scrollMetrics.overflowY).toBe("auto");
      expect(scrollMetrics.scrollHeight).toBeGreaterThan(
        scrollMetrics.clientHeight,
      );

      const footerMetrics = await sidebar.evaluate((node) => {
        const list = node.querySelector(".documents-builder-template-list");
        const button = node.querySelector(
          ".documents-builder-sidebar-create-btn",
        );
        const listBottom = list?.getBoundingClientRect().bottom ?? 0;
        const buttonRect = button?.getBoundingClientRect();
        const sidebarBottom = node.getBoundingClientRect().bottom;

        return {
          buttonBottom: buttonRect?.bottom ?? 0,
          buttonTop: buttonRect?.top ?? 0,
          listBottom,
          sidebarBottom,
        };
      });

      expect(footerMetrics.buttonTop).toBeGreaterThanOrEqual(
        footerMetrics.listBottom,
      );
      expect(footerMetrics.buttonBottom).toBeLessThanOrEqual(
        footerMetrics.sidebarBottom,
      );
    }

    const previewButton = page.getByRole("button", {
      name: "Prévia PDF",
    });
    await previewButton.click();
    await expect(
      page.getByRole("dialog", {
        name: "Prévia do Documento em PDF",
      }),
    ).toBeVisible();
    await saveQaScreenshot(
      page,
      testInfo,
      `documents-builder-preview-${viewport}`,
    );
    await expectViewportSafe(page);
  }

  for (const viewport of ["desktop", "mobile"] as const) {
    await setQaViewport(page, viewport);
    await page.goto("/documents");
    await page
      .getByRole("navigation", { name: "Seções de documentos" })
      .getByRole("button", { name: /^Modelos\b/ })
      .click();
    await expectNoBlockingAxeViolations(page);
    await page.getByRole("button", { name: "Prévia PDF" }).click();
    await expect(
      page.getByRole("dialog", {
        name: "Prévia do Documento em PDF",
      }),
    ).toBeVisible();
    await expectNoBlockingAxeViolations(page);
  }
});
