import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import {
  capture,
  installConnectedWhatsappConnectionStub,
  installLocalOwnerSession,
  waitForApiReady,
} from "./crm-whatsapp-test-helpers";
import { installExtrasActionRoutes } from "./crm-whatsapp-extras-helpers";
import { installFailedProviderEventRoutes } from "./crm-whatsapp-provider-events-helpers";

const connectionId = "24000000-0000-4000-8000-000000000101";

test.describe("CRM WhatsApp extras", () => {
  test("uses quick messages, tags, catalog, vehicle, and location actions", async ({
    page,
    request,
  }, testInfo) => {
    const messageId = `pw-extras-${Date.now()}`;
    const contactName = `Extras E2E ${messageId}`;
    const phone = `551188${String(Date.now()).slice(-8)}`;

    await seedWhatsappSession(request, {
      contactName,
      message: "Quero ver opcoes da loja",
      messageId,
      phone,
    });

    await installConnectedWhatsappConnectionStub(page, connectionId);
    const sendState = await installExtrasActionRoutes(page, messageId);

    await installLocalOwnerSession(page);
    await page.goto("/crm#/crm?surface=whatsapp");
    await page
      .getByPlaceholder("Buscar por contato, telefone ou mensagem")
      .fill(contactName);
    await page
      .getByLabel("Conversas do WhatsApp")
      .getByText(contactName)
      .click();
    await expect(
      page.getByRole("button", { name: "Marcar conversa como nao lida" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Marcar conversa como nao lida" })
      .click();
    await expect(
      page.getByRole("button", { name: "Marcar conversa como lida" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Marcar conversa como lida" })
      .click();

    await page.getByRole("button", { name: "Assumir" }).click();
    await expect(
      page.getByRole("button", { name: "Meu atendimento" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Meus" }).click();
    await expect(
      page.getByLabel("Conversas do WhatsApp").getByText(contactName),
    ).toBeVisible();

    const composer = page.getByPlaceholder("Digite uma mensagem...");
    await composer.fill("/");
    await expect(
      page.getByText("Crie sua primeira mensagem rapida"),
    ).toBeVisible();
    await composer.fill("");

    const customShortcut = `/pw${String(Date.now()).slice(-6)}`;
    const customTitle = `Modelo ${messageId}`;
    const customText = `Mensagem rapida ${messageId}`;
    const editedTitle = `${customTitle} editado`;
    const editedText = `${customText} atualizada`;
    await page.getByRole("button", { name: "Anexos" }).click();
    await page.getByRole("button", { name: "Mensagens rapidas" }).click();
    await page.getByLabel("Atalho").fill(customShortcut);
    await page.getByLabel("Nome").fill(customTitle);
    await page.getByLabel("Texto").fill(customText);
    await page.getByRole("button", { name: "Salvar modelo" }).click();
    const editTemplate = page.getByRole("button", {
      name: `Editar ${customTitle}`,
    });
    await editTemplate.scrollIntoViewIfNeeded();
    await editTemplate.click();
    await page.getByLabel("Nome").fill(editedTitle);
    await page.getByLabel("Texto").fill(editedText);
    await page.getByRole("button", { name: "Atualizar modelo" }).click();
    const editedTemplate = page.getByRole("button", {
      name: `Editar ${editedTitle}`,
    });
    await editedTemplate.scrollIntoViewIfNeeded();
    await expect(editedTemplate).toBeVisible();
    await page.getByRole("dialog").getByText("Fechar").click();
    await composer.fill("/");
    await page.getByRole("button", { name: new RegExp(editedTitle) }).click();
    await expect(composer).toHaveValue(editedText);
    await composer.fill(customShortcut);
    await page.getByRole("button", { name: new RegExp(editedTitle) }).click();
    await expect(composer).toHaveValue(editedText);
    await composer.fill("");

    await page.getByRole("button", { name: "Adicionar etiqueta" }).click();
    await page
      .getByLabel("Detalhe da conversa")
      .getByRole("button", { name: "Quente" })
      .click();
    await expect(page.getByText("Quente").first()).toBeVisible();

    await page.getByRole("button", { name: "Anexos" }).click();
    await page.getByRole("button", { name: "Enviar catalogo" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Honda Civic EXL Catalogo")).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { exact: true, name: "Enviar" })
      .click();
    await expect
      .poll(() => sendState.sentCatalogProductId)
      .toBe("prod_civic_e2e");
    await expect(
      page.getByText("Honda Civic EXL Catalogo").last(),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.getByRole("button", { name: "Anexos" }).click();
    await page.getByRole("button", { name: "Enviar veiculo" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Audi A4 Prestige Plus 2022")).toBeVisible();
    await capture(page, testInfo, "crm-whatsapp-vehicle-picker");
    await page
      .getByRole("dialog")
      .getByRole("button", { exact: true, name: "Enviar" })
      .click();
    await expect
      .poll(() => sendState.sentVehicleListingId)
      .toBe("10000000-0000-4000-8000-000000000001");
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.getByRole("button", { name: "Anexos" }).click();
    await page.getByRole("button", { name: "Localizacao" }).click();
    await page.getByLabel("Latitude").fill("-23.56168");
    await page.getByLabel("Longitude").fill("-46.65598");
    await page.getByLabel("Endereco").fill("Av. Paulista, 1000");
    await page
      .getByRole("dialog")
      .getByRole("button", { exact: true, name: "Enviar" })
      .click();
    await expect
      .poll(() => sendState.sentLocationAddress)
      .toBe("Av. Paulista, 1000");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("link", { name: /Loja/ }).last()).toBeVisible();

    await capture(page, testInfo, "crm-whatsapp-extras");
  });

  test("blocks catalog product send when WhatsApp catalog loading fails", async ({
    page,
    request,
  }, testInfo) => {
    const messageId = `pw-catalog-failure-${Date.now()}`;
    const contactName = `Catalog Failure ${messageId}`;
    await seedWhatsappSession(request, {
      contactName,
      message: "Quero catalogo",
      messageId,
      phone: `551177${String(Date.now()).slice(-8)}`,
    });
    await installConnectedWhatsappConnectionStub(page, connectionId);
    await installFailingCatalogRoute(page);
    await installFailedProviderEventRoutes(page);
    await installLocalOwnerSession(page);

    await page.goto("/crm#/crm?surface=whatsapp");
    await expect(
      page.getByRole("button", { name: /1 evento ZAPI com falha/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: /1 evento ZAPI com falha/ }).click();
    await expect(page.getByText("timeout na entrega")).toBeVisible();
    await page.getByRole("button", { name: "Reprocessar" }).click();
    await expect(
      page.getByRole("button", { name: /evento ZAPI/i }),
    ).toBeHidden();
    await page
      .getByPlaceholder("Buscar por contato, telefone ou mensagem")
      .fill(contactName);
    await page
      .getByLabel("Conversas do WhatsApp")
      .getByText(contactName)
      .click();
    await page.getByRole("button", { name: "Anexos" }).click();
    await page.getByRole("button", { name: "Enviar catalogo" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/Nao foi possivel carregar/)).toBeVisible();
    await expect(
      dialog.getByRole("button", { exact: true, name: "Enviar" }),
    ).toBeDisabled();
    await capture(page, testInfo, "crm-whatsapp-catalog-failure");
  });
});

async function seedWhatsappSession(
  request: APIRequestContext,
  input: {
    contactName: string;
    message: string;
    messageId: string;
    phone: string;
  },
) {
  await waitForApiReady(request);
  const response = await request.post(
    `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/received`,
    {
      data: {
        messageId: input.messageId,
        phone: input.phone,
        senderName: input.contactName,
        text: { message: input.message },
        timestamp: Math.floor(Date.now() / 1000),
      },
    },
  );
  expect(response.status()).toBe(201);
}

async function installFailingCatalogRoute(page: Page) {
  await page.route("**/crm/whatsapp/catalog/products**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ message: "catalog unavailable" }),
      headers: { "content-type": "application/json" },
      status: 502,
    });
  });
}
