import { expect, test } from "@playwright/test";
import { installLocalOwnerSession } from "./crm-whatsapp-test-helpers";
import {
  installCampaignApiMocks,
  installNoopCampaignEventSource,
} from "./crm-whatsapp-campaigns-helpers";
import {
  birthDateLeadId,
  createTinyPngFile,
  installBirthDateApiMocks,
  installCampaignCreateCapture,
  installSpecialDateApiMocks,
  secondCampaignConnectionId,
} from "./crm-new-feature-fixtures";
import { saveQaScreenshot } from "./support/artifacts";
import { setQaViewport } from "./support/viewports";

test.describe("CRM campaign media, special dates and birth dates", () => {
  test("selects, previews, removes and sends a campaign image payload", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    const capture = await installCampaignCreateCapture(page);

    await page.goto("/crm#/crm?surface=conversations");
    await page.getByRole("tab", { name: /Campanhas/ }).click();
    await page.getByRole("button", { name: "Nova campanha" }).click();

    const imageInput = page.getByLabel("Selecionar imagem da campanha");
    await expect(imageInput).toHaveCount(1);
    await imageInput.setInputFiles(createTinyPngFile());
    await expect(
      page.getByAltText("Pré-visualização campanha-e2e.png"),
    ).toBeVisible();
    await expect(page.getByLabel("Legenda da imagem")).toBeVisible();
    await expect(
      page.getByText(/Use \{nome\} para personalizar/),
    ).toContainText("1000");
    await saveQaScreenshot(page, testInfo, "crm-campaign-image-desktop");

    await page.getByRole("button", { name: "Remover imagem" }).click();
    await expect(
      page.getByText("Adicione uma imagem para acompanhar a mensagem inicial."),
    ).toBeVisible();
    await expect(page.getByLabel("Mensagem inicial")).toBeVisible();

    await imageInput.setInputFiles({
      buffer: Buffer.from("not-an-image"),
      mimeType: "application/pdf",
      name: "arquivo.pdf",
    });
    await expect(
      page.getByText(
        "Tipo de imagem não suportado. Escolha JPEG, PNG, WebP ou GIF.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continuar" }),
    ).toBeDisabled();

    await imageInput.setInputFiles(createTinyPngFile());
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: /Ana Premium/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    const startInput = page.getByLabel("Inicio da campanha");
    await startInput.fill("2099-01-01T10:00", { force: true });
    await expect(
      page.getByRole("button", { name: "Agendar campanha" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Agendar campanha" }).click();
    await expect
      .poll(() => capture.readPayload(), { timeout: 10_000 })
      .toEqual(
        expect.objectContaining({
          mediaBase64: expect.any(String),
          mediaFileName: "campanha-e2e.png",
          mediaType: "image/png",
        }),
      );
    expect(capture.readPayload()?.mediaBase64).toBe(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    );
  });

  test("keeps the campaign image controls within a mobile viewport", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "mobile");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);

    await page.goto("/crm#/crm?surface=conversations");
    await page.getByRole("button", { name: "Mais" }).click();
    await page
      .getByRole("group", { name: "Outras áreas do CRM" })
      .getByRole("button", { name: "Campanhas" })
      .click();
    await page.getByRole("button", { name: "Nova campanha" }).click();
    await page
      .getByLabel("Selecionar imagem da campanha")
      .setInputFiles(createTinyPngFile());
    await expect(
      page.getByAltText("Pré-visualização campanha-e2e.png"),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.locator(".crm-campaign-image-picker").scrollIntoViewIfNeeded();
    await saveQaScreenshot(page, testInfo, "crm-campaign-image-mobile-picker", {
      fullPage: false,
    });
    await saveQaScreenshot(page, testInfo, "crm-campaign-image-mobile");
  });

  test("loads, saves, disables and scopes special date automation per connection", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    const specialDates = await installSpecialDateApiMocks(page);

    await page.goto("/crm#/crm?surface=conversations&scope=integrations");
    await page.getByRole("tab", { name: "Datas especiais" }).click();
    await expect(
      page.getByRole("heading", { name: "Datas especiais" }),
    ).toBeVisible();
    await expect(
      page.getByRole("switch", { name: "Ativar Aniversário do cliente" }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("article[data-date-type]")).toHaveCount(7);

    const birthdayCard = page.locator('article[data-date-type="birthday"]');
    await birthdayCard
      .getByRole("switch", { name: "Ativar Aniversário do cliente" })
      .click();
    await birthdayCard
      .getByLabel("Antecedência para Aniversário do cliente")
      .fill("5");
    await birthdayCard
      .getByLabel("Mensagem para Aniversário do cliente")
      .fill("Olá {nome}, sua data especial chegou.");
    await birthdayCard
      .getByRole("button", { name: "Salvar configuração" })
      .click();
    await expect(
      page.getByText("Configuração de aniversário do cliente salva."),
    ).toBeVisible();
    expect(specialDates.saves).toContainEqual({
      body: {
        enabled: false,
        leadDays: 5,
        messageTemplate: "Olá {nome}, sua data especial chegou.",
        sendTime: "09:00",
      },
      connectionId: "24000000-0000-4000-8000-000000000101",
      dateType: "birthday",
    });
    await saveQaScreenshot(page, testInfo, "crm-special-dates-desktop");

    await page.getByLabel("Conexão para datas especiais").click();
    await page.getByRole("option", { name: "ZAPI E2E Secundária" }).click();
    const secondBirthdayCard = page.locator(
      'article[data-date-type="birthday"]',
    );
    await expect(secondBirthdayCard).toHaveAttribute("data-enabled", "true");
    await expect(
      secondBirthdayCard.getByLabel("Mensagem para Aniversário do cliente"),
    ).toHaveValue("Olá {nome}, mensagem da segunda conexão.");
    expect(
      specialDates.configsByConnection.get(secondCampaignConnectionId)?.[0]
        ?.connectionId,
    ).toBe(secondCampaignConnectionId);
  });

  test("edits a lead birth date and sends the canonical date to the CRM API", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    const leadState = await installBirthDateApiMocks(page);

    await page.goto(
      `/crm#/crm?surface=leads&leadId=${encodeURIComponent(birthDateLeadId)}`,
    );
    await expect(
      page.getByRole("heading", { name: "Ana Nascimento" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Editar dados de Ana Nascimento" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Editar cliente" });
    await expect(dialog).toBeVisible();
    const dateTrigger = dialog.getByRole("button", {
      name: "Nascimento:DD/MM/AAAA",
    });
    await dateTrigger.click();
    await page.getByRole("button", { name: "2026", exact: true }).click();
    await page.getByRole("button", { name: "2020", exact: true }).click();
    await page.getByRole("button", { name: "Set", exact: true }).click();
    await page.getByRole("button", { name: "Mai", exact: true }).click();
    await page.getByRole("button", { name: /17 de maio de 2020/i }).click();
    await expect(
      dialog.getByRole("button", { name: "Nascimento:17/05/2020" }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Salvar alterações" }).click();
    await expect
      .poll(() => leadState.updates, { timeout: 10_000 })
      .toContainEqual(expect.objectContaining({ birthDate: "2020-05-17" }));
    await expect(dialog).toBeHidden();
    await expect(page.getByText("17/05/2020", { exact: true })).toBeVisible();
    await saveQaScreenshot(page, testInfo, "crm-lead-birthdate-desktop");
  });
});
