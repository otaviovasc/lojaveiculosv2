import { expect, test } from "@playwright/test";
import {
  installCampaignApiMocks,
  installNoopCampaignEventSource,
} from "./crm-whatsapp-campaigns-helpers";
import { installLocalOwnerSession } from "./crm-whatsapp-test-helpers";
import { saveQaScreenshot } from "./support/artifacts";
import {
  expectNoBlockingAxeViolations,
  expectViewportSafe,
} from "./support/pageChecks";
import { setQaViewport } from "./support/viewports";

const avatarSvg =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="20" fill="#111827"/><text x="40" y="49" text-anchor="middle" font-family="Arial" font-size="28" font-weight="700" fill="#fff">AP</text></svg>',
  );

test.describe("CRM WhatsApp conversations", () => {
  test("renders Repasses-style filters, rows, and selection mode", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    await page.route("**/crm/whatsapp/sessions**", (route) =>
      route.fulfill({
        body: JSON.stringify(createRichSessions()),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    await page.route("**/crm/whatsapp/sessions/*/unread", (route) =>
      route.fulfill({
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await page.goto("/crm#/crm?surface=whatsapp");

    await expect(page.getByRole("heading", { name: "CRM" })).toBeVisible();
    await expect(
      page.getByText("Tenho interesse no Civic.").first(),
    ).toBeVisible();
    await expect(page.getByText("Quente").first()).toBeVisible();
    const filterRail = page.getByLabel("Filtro rápido");
    await expect
      .poll(() =>
        filterRail.evaluate(
          (element) => element.scrollWidth > element.clientWidth,
        ),
      )
      .toBe(true);

    await page.getByRole("button", { name: /Etiquetas/ }).click();
    await expect(page.getByRole("button", { name: "Respondeu" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /Outros/ }).click();
    const assigneeRequest = page.waitForRequest((request) =>
      request.url().includes("assigneeId=70000000-0000-4000-8000-000000000002"),
    );
    await page.getByRole("button", { name: "Bruno Santos" }).click();
    await assigneeRequest;
    await expect(page.getByRole("button", { name: /Outros/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "Nova conversa" }).click();
    await expect(
      page.locator(".crm-whatsapp-action-panel header h2"),
    ).toBeVisible();
    await expect(
      page.getByText("Inicie o atendimento pelo número do cliente."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Fechar" }).click();

    await page.getByRole("button", { name: /Ana Premium/ }).click();
    await expect(page.getByLabel("Detalhe da conversa")).toContainText(
      "Tenho interesse no Civic.",
    );
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-conversations");

    await page.getByRole("button", { name: "Selecionar conversas" }).click();
    await expect(page.getByText("Selecione conversas")).toBeVisible();
    await page.getByRole("button", { name: /Ana Premium/ }).click();
    await expect(page.getByText("1 conversa", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Não lidas", exact: true }).click();
    await saveQaScreenshot(
      page,
      testInfo,
      "crm-whatsapp-conversations-selection",
    );
    const unreadRequest = page.waitForRequest((request) =>
      request.url().endsWith("/unread"),
    );
    await page.getByRole("button", { name: "Confirmar em 1 conversa" }).click();
    await unreadRequest;
    await expect(page.getByText("Selecione conversas")).toBeVisible();
    await expectViewportSafe(page);
    await expectNoBlockingAxeViolations(page);
  });

  test("uses explicit list and chat panes on mobile", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "mobile");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    await page.route("**/crm/whatsapp/sessions**", (route) =>
      route.fulfill({
        body: JSON.stringify(createRichSessions()),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await page.goto("/crm#/crm?surface=whatsapp");
    await expect(
      page.getByLabel("Conversas do WhatsApp").first(),
    ).toBeVisible();
    await expect(page.getByLabel("Detalhe da conversa")).toBeHidden();
    const mobileNavigation = page.getByRole("navigation", {
      name: "Navegação móvel do WhatsApp CRM",
    });
    await expect(mobileNavigation).toBeVisible();

    await page.getByRole("button", { name: /Ana Premium/ }).click();
    await expect(page.getByLabel("Detalhe da conversa")).toBeVisible();
    await expect(mobileNavigation).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Voltar para conversas" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-conversation-mobile");
    await expectViewportSafe(page);
    await expectNoBlockingAxeViolations(page);

    await page.getByRole("button", { name: "Voltar para conversas" }).click();
    await expect(
      page.getByLabel("Conversas do WhatsApp").first(),
    ).toBeVisible();
    await expect(page.getByLabel("Detalhe da conversa")).toBeHidden();
    await expect(mobileNavigation).toBeVisible();
  });

  test("hides inbox tools when WhatsApp is disconnected", async ({ page }) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    await page.route("**/crm/whatsapp/connections", (route) =>
      route.fulfill({
        body: JSON.stringify({ connections: [] }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await page.goto("/crm#/crm?surface=whatsapp");

    await expect(
      page.getByRole("heading", {
        name: "Conecte o numero da loja para abrir o atendimento.",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Conversas do WhatsApp")).toHaveCount(0);
    await page.getByRole("button", { name: "Configurar conexao" }).click();
    await expect(page.getByRole("tab", { name: "Conexão" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByLabel("Conexao")).toContainText(
      "Nenhuma conexao ZAPI configurada para esta loja.",
    );
  });
});

function createRichSessions() {
  return [
    {
      assignedMember: {
        email: "carla@example.com",
        id: 11,
        name: "Carla",
        role: "OWNER",
      },
      buyerName: "Ana Premium",
      buyerPhone: "5511999999999",
      channel: "WHATSAPP",
      connection: {
        id: "24000000-0000-4000-8000-000000000101",
        name: "ZAPI Matriz",
        phone: "5511888887777",
        provider: "zapi",
        status: "active",
      },
      id: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
      lastMessageAt: "2026-07-07T12:00:00.000Z",
      lastMessageContent: "Tenho interesse no Civic.",
      leadId: "0b6ec94e-3bd8-4782-a8bb-7de0f0afae6f",
      metadata: { adTitle: "Civic Touring em destaque", isAdInitiated: true },
      profilePhotoUrl: avatarSvg,
      sessionTags: [
        { color: "var(--color-accent)", id: "tag_hot", name: "Quente" },
        { color: "var(--color-green-start)", id: "tag_reply", name: "Retorno" },
      ],
      status: "ACTIVE",
      unreadCount: 3,
      uuid: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
      vehicle: { id: 44, mainPhotoUrl: null, title: "Civic Touring" },
    },
    {
      assignedMember: null,
      assignedUserId: null,
      buyerName: "Bruno Retorno",
      buyerPhone: "551188887777",
      channel: "WHATSAPP",
      connection: {
        id: "24000000-0000-4000-8000-000000000101",
        name: "ZAPI Matriz",
        phone: "5511888887777",
        provider: "zapi",
        status: "active",
      },
      id: "5e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
      lastMessageAt: "2026-07-07T11:40:00.000Z",
      lastMessageContent: "Pode me chamar depois das 15h?",
      sessionTags: [
        { color: "var(--color-blue-start)", id: "tag_2", name: "Follow" },
      ],
      status: "HUMAN_TAKEOVER",
      unreadCount: 0,
      uuid: "5e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
      vehicle: null,
    },
  ];
}
