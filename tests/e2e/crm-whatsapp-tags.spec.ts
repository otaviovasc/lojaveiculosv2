import { expect, test } from "@playwright/test";
import {
  installCampaignApiMocks,
  installNoopCampaignEventSource,
} from "./crm-whatsapp-campaigns-helpers";
import { installLocalOwnerSession } from "./crm-whatsapp-test-helpers";
import { saveQaScreenshot } from "./support/artifacts";
import { setQaViewport } from "./support/viewports";

test.describe("CRM WhatsApp tags", () => {
  test("renders label management with preview and quick pickers", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);

    await page.goto("/crm#/crm?surface=whatsapp");
    await page.getByRole("tab", { name: /Etiquetas/ }).click();

    await expect(
      page.getByRole("heading", { name: "Etiquetas" }),
    ).toBeVisible();
    await expect(page.getByText("Previa")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Usar cor Urgente" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Editar etiqueta Oferta enviada" })
      .click();
    await expect(page.getByLabel("Nome")).toHaveValue("Oferta enviada");
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-tags");
  });
});
