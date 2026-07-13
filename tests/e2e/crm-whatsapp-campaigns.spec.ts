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
    await expect(
      page.getByRole("tab", { name: /Agendar mensagem/ }),
    ).toBeVisible();
    await page.getByRole("tab", { name: /Campanhas/ }).click();

    await expect(
      page.getByRole("button", { name: /Black Friday Premium/ }),
    ).toBeVisible();
    await expect(page.getByText("Follow-up enviado")).toBeVisible();
    await expect(page.getByText("Obrigado pelo retorno")).toBeVisible();
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-campaigns");

    await page.getByRole("button", { name: "Nova campanha" }).click();
    await expect(
      page.getByRole("navigation", { name: "Etapas do fluxo" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: /Ana Premium/ }).click();
    await page.getByRole("tab", { name: "Leads" }).click();
    await page.getByLabel("Filtrar leads por status").click();
    await page.getByRole("option", { name: "Qualificado" }).click();
    await expect(page.getByText(/2 lead\(s\) encontrado\(s\)/)).toBeVisible();
    await expect(page.getByText(/1 sem conversa vinculada/)).toBeVisible();
    await page
      .getByLabel("Origem dos destinatarios")
      .getByRole("tab", { name: "Conversas" })
      .click();
    await page
      .getByPlaceholder("telefone,nome\n5511999999999,Ana")
      .fill("11999999999,Fantasma");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page
      .getByRole("heading", { name: "Revisao de envio" })
      .scrollIntoViewIfNeeded();
    await expect(page.getByText("Conversa V2 nao encontrada")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continuar" }),
    ).toBeDisabled();
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-campaigns-review");
    await page.getByText("Conversa V2 nao encontrada").scrollIntoViewIfNeeded();
    await saveQaScreenshot(
      page,
      testInfo,
      "crm-whatsapp-campaigns-review-rows",
    );
  });
});
