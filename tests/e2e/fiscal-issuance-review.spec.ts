import { expect, test } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession } from "./support/auth";
import { qaPersonas } from "./support/personas";
import { expectAccessible, expectViewportSafe } from "./support/uiQuality";
import { setQaViewport, type QaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test("reviews the fiscal origin before starting issuance", async ({
  page,
}, testInfo) => {
  await installLocalSession(page, {
    permissions: ["fiscal.manage"],
    persona: qaPersonas.owner,
  });

  let issueCalls = 0;
  await page.route("**/api/v1/fiscal/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/overview")) {
      await route.fulfill({
        body: JSON.stringify(fiscalOverview),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    if (
      url.pathname.endsWith("/documents") &&
      route.request().method() === "POST"
    ) {
      issueCalls += 1;
      await route.fulfill({
        body: JSON.stringify(fiscalDocument),
        contentType: "application/json",
        status: 201,
      });
      return;
    }
    await route.continue();
  });

  for (const viewport of ["desktop", "mobile"] satisfies QaViewport[]) {
    await setQaViewport(page, viewport);
    await page.goto("/fiscal");
    await page.getByLabel("Operação de origem").fill(`venda QA ${viewport}`);
    await page.getByRole("button", { name: "Emitir NF-e" }).click();

    const dialog = page.getByRole("dialog", {
      name: "Revisar antes de emitir",
    });
    await expect(dialog).toBeVisible();
    expect(issueCalls).toBe(0);
    await expectAccessible(page);
    await expectViewportSafe(page);
    await saveQaScreenshot(page, testInfo, `fiscal-review-${viewport}`);

    if (viewport === "desktop") {
      await dialog.getByRole("button", { name: "Cancelar" }).click();
      await expect(dialog).toBeHidden();
    } else {
      await dialog.getByRole("button", { name: "Confirmar emissão" }).click();
      await expect.poll(() => issueCalls).toBe(1);
    }
  }
});

const fiscalDocument = {
  accessKey: null,
  createdAt: "2026-07-11T12:00:00.000Z",
  documentType: "nfe_vehicle_sale",
  id: "fiscal_qa",
  issuedAt: null,
  metadata: {},
  provider: "spedy",
  providerDocumentId: null,
  status: "draft",
};

const fiscalOverview = {
  documents: [],
  provider: {
    configured: true,
    missingConfiguration: [],
    provider: "spedy",
    webhookConfigured: true,
  },
  summary: { cancelled: 0, failed: 0, issued: 0, pending: 0 },
};
