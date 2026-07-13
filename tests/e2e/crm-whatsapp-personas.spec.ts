import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  capture,
  installConnectedWhatsappConnectionStub,
  seedWhatsappSession,
} from "./crm-whatsapp-test-helpers";
import { installProviderEventIssueRoutes } from "./crm-whatsapp-provider-events-helpers";

type Persona = {
  key: string;
  name: string;
  operator: boolean;
};

const connectionId = "24000000-0000-4000-8000-000000000101";
const personas: Persona[] = [
  { key: "investor", name: "Test Investor", operator: false },
  { key: "salesman", name: "Seed Salesman", operator: true },
  { key: "supervisor", name: "Seed Supervisor", operator: true },
  { key: "owner", name: "Seed Owner", operator: true },
];
const chatOpenTimeout = 30_000;

test.describe("CRM WhatsApp personas", () => {
  test("matches the queue action surface to each store role", async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(120_000);
    const messageId = `pw-persona-${Date.now()}`;
    const contactName = `Persona E2E ${messageId}`;
    const message = `Quero falar com a loja ${messageId}`;
    const seeded = await seedWhatsappSession(request, {
      connectionId,
      contactName,
      message,
      messageId,
      phone: `551166${String(Date.now()).slice(-8)}`,
    });
    await installConnectedWhatsappConnectionStub(page, connectionId);
    await installProviderEventIssueRoutes(page);
    const sentTexts = await installSendTextRoute(page);

    for (const persona of personas) {
      await loginAs(page, persona, testInfo);
      await openWhatsappConversation(page, {
        contactName,
        message,
        sessionId: seeded.sessionId,
      });
      await expect(
        page.getByRole("button", { name: "WhatsApp" }).first(),
      ).toBeVisible();
      await expect(page.getByText("Acesso restrito")).toHaveCount(0);

      if (persona.operator) {
        await expectOperatorActions(page);
        if (persona.key === "salesman") {
          await sendTextAsOperator(page, messageId, sentTexts);
        }
      } else {
        await expectReadOnlyActions(page);
      }
      await capture(page, testInfo, `crm-whatsapp-persona-${persona.key}`);
    }
  });
});

async function loginAs(page: Page, persona: Persona, testInfo: TestInfo) {
  await page.goto("/sign-in");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Selecionar perfil" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: new RegExp(`^${escapeRegExp(persona.name)}`) })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await capture(page, testInfo, `crm-whatsapp-sign-in-${persona.key}`);
}

async function openWhatsappConversation(
  page: Page,
  input: {
    contactName: string;
    message: string;
    sessionId: string;
  },
) {
  await page.goto(
    `/crm#/crm?surface=whatsapp&crm_session=${encodeURIComponent(
      input.sessionId,
    )}`,
  );
  await expect(
    page.getByPlaceholder("Buscar por contato, telefone ou mensagem"),
  ).toBeVisible();
  await expect(
    page.getByLabel("Detalhe da conversa").getByText(input.contactName),
  ).toBeVisible({ timeout: chatOpenTimeout });
  await expect(
    page.getByLabel("Detalhe da conversa").getByText(input.message),
  ).toBeVisible({ timeout: chatOpenTimeout });
}

async function expectOperatorActions(page: Page) {
  await expect(page.getByPlaceholder("Digite uma mensagem...")).toBeEnabled();
  await expect(page.getByRole("button", { name: "Anexos" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Adicionar etiqueta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Alternar atendimento humano" }),
  ).toBeVisible();
  await expect(page.getByLabel("Atribuir conversa")).toBeVisible();
  await expect(page.getByRole("button", { name: "Assumir" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Concluir" })).toBeVisible();

  await page.getByLabel("Selecionar conversa").first().click();
  await expect(
    page.getByLabel("Atribuir conversas selecionadas"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Concluir conversas selecionadas" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Marcar conversas selecionadas como lidas",
    }),
  ).toBeVisible();
}

async function expectReadOnlyActions(page: Page) {
  const failedSummary = page.getByRole("button", {
    name: /1 evento ZAPI com atenção/,
  });
  await expect(failedSummary).toBeVisible();
  await failedSummary.click();
  await expect(page.getByText("timeout na entrega")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reprocessar" })).toHaveCount(
    0,
  );
  await expect(page.getByText("Somente leitura")).toBeVisible();
  await expect(
    page.getByText("Seu perfil pode acompanhar esta conversa"),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Digite uma mensagem...")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Anexos" })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Adicionar etiqueta" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Alternar atendimento humano" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Atribuir conversa")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Assumir" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Concluir" })).toHaveCount(0);

  await page.getByLabel("Selecionar conversa").first().click();
  await expect(
    page.getByRole("button", {
      name: "Marcar conversas selecionadas como lidas",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Atribuir conversas selecionadas")).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Concluir conversas selecionadas" }),
  ).toHaveCount(0);
}

async function installSendTextRoute(page: Page) {
  const sentTexts: string[] = [];
  await page.route("**/crm/whatsapp/send/text", async (route) => {
    const body = route.request().postDataJSON() as {
      sessionId?: string;
      text?: string;
    };
    if (body.text) sentTexts.push(body.text);
    await route.fulfill({
      body: JSON.stringify({
        content: body.text,
        createdAt: new Date().toISOString(),
        direction: "OUTBOUND",
        id: `text-${Date.now()}`,
        providerTimestamp: new Date().toISOString(),
        senderType: "HUMAN",
        status: "SENT",
        type: "TEXT",
      }),
      headers: { "content-type": "application/json" },
      status: 201,
    });
  });
  return sentTexts;
}

async function sendTextAsOperator(
  page: Page,
  messageId: string,
  sentTexts: string[],
) {
  const text = `Resposta operador ${messageId}`;
  await page.getByPlaceholder("Digite uma mensagem...").fill(text);
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect.poll(() => sentTexts.includes(text)).toBe(true);
  await expect(
    page.getByLabel("Detalhe da conversa").getByText(text),
  ).toBeVisible();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
