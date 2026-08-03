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
    await page.getByRole("tab", { name: /Conexão/ }).click();

    const connection = page.getByRole("region", { name: "Conexao" });
    await expect(connection.getByText("Z-API", { exact: true })).toBeVisible();
    await expect(
      connection.getByText("Z-API: online", { exact: true }),
    ).toBeVisible();
    await expect(connection.getByText("Online", { exact: true })).toBeVisible();
    await expect(connection.getByText(/^Conectado - \d+$/)).toBeVisible();
    await expect(connection.getByText("Credenciais protegidas")).toBeVisible();
    await expect(connection.getByText("Webhooks da integracao")).toBeVisible();
    await expect(connection.getByLabel("ID da instancia")).toBeHidden();
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-connection");

    await connection.getByText("Credenciais protegidas").click();
    await expect(connection.getByLabel("ID da instancia")).toBeVisible();
    await expect(connection.getByLabel("Token da instancia")).toBeVisible();
    await connection.getByText("Webhooks da integracao").click();
    await expect(
      connection.getByRole("textbox", { name: /received/ }),
    ).toBeVisible();
    await expect(
      connection.getByRole("textbox", { name: /chat-presence/ }),
    ).toBeVisible();
  });
});
