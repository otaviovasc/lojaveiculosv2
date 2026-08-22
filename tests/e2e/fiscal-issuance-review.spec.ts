import { expect, test } from "@playwright/test";
import { saveQaScreenshot } from "./support/artifacts";
import { installLocalSession } from "./support/auth";
import { qaPersonas } from "./support/personas";
import { expectAccessible, expectViewportSafe } from "./support/uiQuality";
import { setQaViewport, type QaViewport } from "./support/viewports";

test.use({ baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173" });

test("reviews a standalone fiscal origin before starting issuance", async ({
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
      url.pathname.endsWith("/connection") &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        body: JSON.stringify(fiscalConnection),
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    if (
      url.pathname.endsWith("/recipients") &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        body: "[]",
        contentType: "application/json",
        status: 200,
      });
      return;
    }
    if (
      url.pathname.endsWith("/templates") &&
      route.request().method() === "GET"
    ) {
      await route.fulfill({
        body: JSON.stringify([fiscalTemplate]),
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
    await page.getByRole("tab", { name: "Emitir" }).click();
    await page.getByRole("button", { name: "NFS-e (serviço)" }).click();
    const reference = `venda QA ${viewport}`;
    await page.getByLabel("Referência externa").fill(reference);
    await page.getByRole("button", { name: "Avançar" }).click();
    await page.getByRole("button", { name: "Tipo de comissão" }).click();
    await page
      .getByRole("option", { name: "Comissão de financiamento v1" })
      .click();
    await page.getByLabel("Valor da comissão").fill("1500,00");
    await page.getByRole("button", { name: "Avançar" }).click();
    await page.getByRole("button", { name: "Revisar e emitir" }).click();

    const dialog = page.getByRole("dialog", {
      name: "Revisar antes de emitir",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(`Avulsa (${reference})`)).toBeVisible();
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
  documentKind: "nfse",
  documentType: "nfse_service_commission",
  hasProviderReference: false,
  id: "fiscal_qa",
  issuedAt: null,
  metadata: {},
  provider: "spedy",
  recipientId: null,
  status: "queued",
  templateId: "template_qa",
  templateVersion: 1,
};

const fiscalOverview = {
  capabilities: { canDownloadOfficialArtifacts: false },
  documents: [],
  provider: {
    configured: true,
    missingConfiguration: [],
    provider: "spedy",
    webhookConfigured: true,
  },
  summary: { cancelled: 0, failed: 0, issued: 0, pending: 0 },
};

const fiscalConnection = {
  capabilities: { nfse: true },
  certificateExpiresAt: null,
  companyId: "company_qa",
  defaultsConfirmedAt: "2026-07-11T12:00:00.000Z",
  defaultsConfirmedBy: "user_qa",
  defaultsStatus: "confirmed",
  issuerProfile: {},
  lastErrorCode: null,
  lastSyncedAt: "2026-07-11T12:00:00.000Z",
  provider: "spedy",
  status: "ready",
  taxDefaults: {},
  webhookRegisteredAt: "2026-07-11T12:00:00.000Z",
};

const fiscalTemplate = {
  descriptionTemplate: "Comissão de financiamento {{invoice.grossAmount}}",
  id: "template_qa",
  isActive: true,
  isDefaultForRecipient: false,
  name: "Comissão de financiamento",
  recipientId: null,
  requirements: {},
  retentionConfig: {},
  serviceMunicipalCode: null,
  serviceNationalCode: "10.05",
  taxConfig: {},
  useCase: "financing_commission",
  version: 1,
};
