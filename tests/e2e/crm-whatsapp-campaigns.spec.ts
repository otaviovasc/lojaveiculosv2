import { expect, test } from "@playwright/test";
import { installLocalOwnerSession } from "./crm-whatsapp-test-helpers";
import {
  installCampaignApiMocks,
  installNoopCampaignEventSource,
} from "./crm-whatsapp-campaigns-helpers";
import { saveQaScreenshot } from "./support/artifacts";
import { setQaViewport } from "./support/viewports";

test.describe("CRM WhatsApp campaigns", () => {
  test("renders campaign metrics and recipient detail", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);

    await page.goto("/crm#/crm?surface=whatsapp");
    await page.getByRole("tab", { name: /Campanhas/ }).click();

    await expect(
      page.getByRole("button", { name: /Black Friday Premium/ }),
    ).toBeVisible();
    await expect(page.getByText("Follow-up enviado")).toBeVisible();
    await expect(page.getByText("Obrigado pelo retorno")).toBeVisible();
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-campaigns");
  });
});
