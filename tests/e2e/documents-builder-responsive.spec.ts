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

    const previewTab = page.getByRole("tab", { name: "Prévia" });
    await previewTab.click();
    await expect(previewTab).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("region", { name: "Prévia do documento" }),
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
    await page.getByRole("tab", { name: "Prévia" }).click();
    await expectNoBlockingAxeViolations(page);
  }
});
