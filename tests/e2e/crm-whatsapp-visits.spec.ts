import { expect, test } from "@playwright/test";
import {
  installCampaignApiMocks,
  installNoopCampaignEventSource,
} from "./crm-whatsapp-campaigns-helpers";
import { installLocalOwnerSession } from "./crm-whatsapp-test-helpers";
import { saveQaScreenshot } from "./support/artifacts";
import { setQaViewport } from "./support/viewports";

test.describe("CRM WhatsApp visits", () => {
  test("renders Repasses-style date views and timeline rows", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    await page.route("**/crm/visits**", async (route) => {
      await route.fulfill({
        body: JSON.stringify({ visits: createVisitFixtures() }),
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });

    await page.goto("/crm#/crm?surface=whatsapp");
    await page.getByRole("tab", { name: /Visitas/ }).click();

    await expect(
      page.getByRole("button", { name: "Nova visita" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Hoje/ })).toContainText("1");
    await expect(page.getByRole("button", { name: /Amanha/ })).toContainText(
      "1",
    );
    await expect(page.getByText("Receber Ana no showroom")).toBeVisible();

    await page.getByRole("button", { name: /Amanha/ }).click();
    await expect(page.getByText("Test drive com Bruno")).toBeVisible();
    await expect(page.getByText("Fechamento premium")).not.toBeVisible();
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-visits");

    await page.getByRole("button", { name: "Nova visita" }).click();
    await expect(
      page.getByRole("heading", { name: "Confirme o cliente" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page
      .getByLabel("Data da visita")
      .fill(toDateTimeLocal(dateAtOffset(2)));
    await page
      .getByLabel("Observacoes da visita")
      .fill("Separar o veiculo antes da chegada.");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(
      page.getByRole("heading", { name: "Revise o agendamento" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-visit-workflow");
  });
});

function createVisitFixtures() {
  return [
    createVisit({
      id: "91000000-0000-4000-8000-000000000001",
      notes: "Receber Ana no showroom",
      scheduledAt: dateAtOffset(0).toISOString(),
    }),
    createVisit({
      id: "91000000-0000-4000-8000-000000000002",
      notes: "Test drive com Bruno",
      scheduledAt: dateAtOffset(1).toISOString(),
    }),
    createVisit({
      id: "91000000-0000-4000-8000-000000000003",
      notes: "Fechamento premium",
      scheduledAt: dateAtOffset(3).toISOString(),
    }),
    createVisit({
      id: "91000000-0000-4000-8000-000000000004",
      notes: "Retorno perdido",
      scheduledAt: dateAtOffset(-1).toISOString(),
    }),
    createVisit({
      id: "91000000-0000-4000-8000-000000000005",
      notes: "Visita concluida",
      scheduledAt: dateAtOffset(-2).toISOString(),
      status: "completed",
    }),
  ];
}

function createVisit(
  overrides: Partial<{
    id: string;
    notes: string;
    scheduledAt: string;
    status: string;
  }>,
) {
  const now = new Date().toISOString();
  return {
    assignedUserId: null,
    createdAt: now,
    id: overrides.id,
    leadId: "0b6ec94e-3bd8-4782-a8bb-7de0f0afae6f",
    notes: overrides.notes ?? null,
    scheduledAt: overrides.scheduledAt ?? now,
    status: overrides.status ?? "scheduled",
    storeId: "50000000-0000-4000-8000-000000000001",
    tenantId: "60000000-0000-4000-8000-000000000001",
    updatedAt: now,
  };
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
