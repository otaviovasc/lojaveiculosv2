import { expect, test } from "@playwright/test";
import {
  installCampaignApiMocks,
  installNoopCampaignEventSource,
} from "./crm-whatsapp-campaigns-helpers";
import { installLocalOwnerSession } from "./crm-whatsapp-test-helpers";
import { saveQaScreenshot } from "./support/artifacts";
import { setQaViewport } from "./support/viewports";

test.describe("CRM WhatsApp integrations", () => {
  test("renders external bot config and V2 docs", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    await page.route("**/crm/whatsapp/integrations/bot", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          integration: {
            createdAt: "2026-07-07T12:00:00.000Z",
            enabled: true,
            id: "bot-integration-e2e",
            secretConfigured: true,
            secretUpdatedAt: "2026-07-07T12:00:00.000Z",
            updatedAt: "2026-07-07T12:00:00.000Z",
            webhookUrl: "https://bot.example.test/webhook",
          },
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      });
    });
    await page.route("**/crm/whatsapp/provider-events/issues**", (route) =>
      route.fulfill({
        body: JSON.stringify({ events: [] }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await page.goto("/crm#/crm?surface=whatsapp");
    await page.getByRole("tab", { name: /Integracoes/ }).click();

    await expect(
      page.getByRole("heading", { name: "Bot externo" }),
    ).toBeVisible();
    await expect(
      page.getByText("X-Webhook-Secret: seu-segredo").first(),
    ).toBeVisible();
    await expect(page.getByText("Payload do webhook")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Bot Action API" }),
    ).toBeVisible();
    await expect(
      page.getByText("connection_status_changed").first(),
    ).toBeVisible();
    await expect(page.getByText("imageUrl").first()).toBeVisible();
    await expect(page.getByText("audioUrl").first()).toBeVisible();
    await expect(page.getByText("documentUrl").first()).toBeVisible();
    await expect(page.getByText("message.senderOrigin")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "intervention_ended" }),
    ).toBeVisible();
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-integrations");
  });
});
