import { expect, test } from "@playwright/test";
import {
  installCampaignApiMocks,
  installNoopCampaignEventSource,
} from "./crm-whatsapp-campaigns-helpers";
import { installLocalOwnerSession } from "./crm-whatsapp-test-helpers";
import { saveQaScreenshot } from "./support/artifacts";
import { setQaViewport } from "./support/viewports";

test.describe("CRM WhatsApp connection", () => {
  test("renders status, two ZAPI values, and generated webhooks", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);

    await page.goto("/crm#/crm?surface=whatsapp");
    await page.getByRole("tab", { name: /Conexao/ }).click();

    await expect(page.getByText("WhatsApp (ZAPI)")).toBeVisible();
    await expect(page.getByText("Online")).toBeVisible();
    await expect(page.getByText("ZAPI conectada")).toBeVisible();
    await expect(page.getByLabel("ID da instancia")).toBeVisible();
    await expect(page.getByLabel("Token da instancia")).toBeVisible();
    await expect(
      page.locator(
        ".crm-whatsapp-connection-instance-card input:not([readonly])",
      ),
    ).toHaveCount(2);
    await expect(page.getByRole("textbox", { name: /received/ })).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /chat-presence/ }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-connection");
  });
});
