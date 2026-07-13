import { expect, test } from "@playwright/test";
import {
  installCampaignApiMocks,
  installNoopCampaignEventSource,
} from "./crm-whatsapp-campaigns-helpers";
import { campaignConnectionId } from "./crm-whatsapp-campaigns-fixtures";
import { installLocalOwnerSession } from "./crm-whatsapp-test-helpers";
import { saveQaScreenshot } from "./support/artifacts";
import { setQaViewport } from "./support/viewports";

test.describe("CRM WhatsApp schedules", () => {
  test("renders status tabs, filters, and message cards", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    await page.route("**/crm/whatsapp/scheduled-messages**", async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get("status");
      const messages = status
        ? createScheduleFixtures().filter(
            (message) => message.status === status,
          )
        : createScheduleFixtures();
      await route.fulfill({
        body: JSON.stringify(messages),
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });

    await page.goto("/crm#/crm?surface=whatsapp");
    await page.getByRole("tab", { name: /Agendar mensagem/ }).click();

    await expect(
      page.getByRole("button", { name: "Novo agendamento" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /Pendentes/ })).toContainText(
      "1",
    );
    await expect(page.getByText("Ola Ana, posso te ligar hoje?")).toBeVisible();

    await page.getByRole("tab", { name: /Falhas/ }).click();
    await expect(page.getByText("Provider timeout")).toBeVisible();
    await expect(
      page.getByText("Ola Ana, posso te ligar hoje?"),
    ).not.toBeVisible();
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-schedules");

    await page.getByRole("button", { name: "Novo agendamento" }).click();
    await expect(
      page.getByRole("heading", { name: "Escolha a conversa" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Etapas do fluxo" }),
    ).toBeVisible();
    await page.getByRole("button", { exact: true, name: "Conversa" }).click();
    await page.getByRole("option", { name: /Ana Premium/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page
      .getByLabel("Quando enviar")
      .fill(toDateTimeLocal(dateAtOffset(2)));
    await page.getByRole("button", { name: "Continuar" }).click();
    await page
      .getByRole("textbox", { exact: true, name: "Mensagem" })
      .fill("Mensagem programada pela equipe.");
    await expect(
      page
        .getByLabel("Previa do agendamento")
        .getByText("Mensagem programada pela equipe."),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-schedule-workflow");
  });
});

function createScheduleFixtures() {
  const now = new Date().toISOString();
  return [
    {
      cancelledAt: null,
      connectionId: campaignConnectionId,
      createdAt: now,
      createdByUserId: "70000000-0000-4000-8000-000000000001",
      errorMessage: null,
      id: "schedule-pending",
      metadata: {},
      phone: "5518996469432",
      scheduledAt: dateAtOffset(1).toISOString(),
      sentAt: null,
      sentMessageId: null,
      sessionId: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
      status: "pending",
      text: "Ola Ana, posso te ligar hoje?",
      updatedAt: now,
    },
    {
      cancelledAt: null,
      connectionId: campaignConnectionId,
      createdAt: now,
      createdByUserId: "70000000-0000-4000-8000-000000000001",
      errorMessage: "Provider timeout",
      id: "schedule-failed",
      metadata: {},
      phone: "5518996469400",
      scheduledAt: dateAtOffset(-1).toISOString(),
      sentAt: null,
      sentMessageId: null,
      sessionId: "5e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
      status: "failed",
      text: "Retorno Bruno",
      updatedAt: now,
    },
  ];
}

function dateAtOffset(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  value.setHours(15, 0, 0, 0);
  return value;
}

function toDateTimeLocal(value: Date) {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
