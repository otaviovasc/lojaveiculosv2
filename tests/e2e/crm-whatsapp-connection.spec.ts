import { expect, test } from "@playwright/test";
import {
  installCampaignApiMocks,
  installNoopCampaignEventSource,
} from "./crm-whatsapp-campaigns-helpers";
import { installLocalOwnerSession } from "./crm-whatsapp-test-helpers";
import { saveQaScreenshot } from "./support/artifacts";
import { setQaViewport } from "./support/viewports";

test.describe("CRM WhatsApp connection", () => {
  test("keeps Z-API visible and posts the server-backed request CTA", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);

    await page.route("**/crm/whatsapp/connections", (route) =>
      route.fulfill({
        body: JSON.stringify({
          allowance: { limit: 0, remaining: 0, used: 0 },
          availableProviders: [],
          connections: [],
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    await page.route("**/billing/overview", (route) =>
      route.fulfill({
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    const request = page.waitForRequest(
      "**/billing/addons/zapi/request",
      (candidate) => candidate.method() === "POST",
    );
    await page.route("**/billing/addons/zapi/request", (route) =>
      route.fulfill({
        body: JSON.stringify({
          contract: {
            addonCode: "crm_zapi",
            cancellationScheduledFor: null,
            id: "zapi-contract-e2e",
            monthlyPriceCents: 24999,
            paidAt: null,
            scheduledFor: null,
            setupCompletedAt: null,
            status: "pending",
            storeId: "store-e2e",
            supportCode: null,
          },
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await page.goto("/crm#/crm?surface=whatsapp");
    await page.getByRole("tab", { name: /Conexão/ }).click();

    const connection = page.getByRole("region", { name: "Conexão" });
    await expect(connection.getByText("Z-API", { exact: true })).toBeVisible();
    await connection.getByRole("button", { name: /Z-API/ }).click();
    await expect(
      connection.getByRole("button", { name: "Solicitar Z-API" }),
    ).toBeVisible();
    await connection.getByRole("button", { name: "Solicitar Z-API" }).click();
    await request;
    await expect(
      connection.getByText("Aguardando confirmação de pagamento"),
    ).toBeVisible();
    await saveQaScreenshot(
      page,
      testInfo,
      "crm-whatsapp-connection-zapi-request",
    );
  });

  test("shows pairing only for a configured Z-API connection", async ({
    page,
  }, testInfo) => {
    await setQaViewport(page, "desktop");
    await installLocalOwnerSession(page);
    await installNoopCampaignEventSource(page);
    await installCampaignApiMocks(page);
    await page.route("**/crm/whatsapp/connections", (route) =>
      route.fulfill({
        body: JSON.stringify({
          allowance: { limit: 1, remaining: 0, used: 1 },
          availableProviders: [],
          connections: [
            {
              credentials: {
                apiBaseUrlEnv: null,
                clientTokenEnv: null,
                instanceIdEnv: null,
                instanceTokenEnv: null,
                mode: "stored",
                storedInstanceConfigured: true,
              },
              displayName: "Z-API E2E",
              externalConnectionId: null,
              externalInstanceId: "stored-instance",
              id: "connection-zapi",
              live: {
                checkedAt: "2026-08-10T12:00:00.000Z",
                connected: false,
                connectedPhone: null,
                providerStatus: "disconnected",
                smartphoneConnected: false,
              },
              phone: null,
              provider: "zapi",
              ready: false,
              setup: {
                attemptCount: 0,
                configuredAt: null,
                lastErrorCode: null,
                requestedAt: "2026-08-10T12:00:00.000Z",
                requiredTypes: [],
                status: "configured",
                succeededTypes: [],
                supportCode: "ZAPI-E2E",
                updatedAt: "2026-08-10T12:00:00.000Z",
                version: 1,
              },
              status: "disconnected",
              webhookUrl: null,
            },
          ],
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    await page.route("**/billing/overview", (route) =>
      route.fulfill({
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    await page.goto("/crm#/crm?surface=whatsapp");
    await page.getByRole("tab", { name: /Conexão/ }).click();

    const connection = page.getByRole("region", { name: "Conexão" });
    await expect(
      connection.getByRole("heading", { name: "Conectar WhatsApp · Z-API" }),
    ).toBeVisible();
    await expect(
      connection.getByRole("button", { name: "Gerar QR Code" }),
    ).toBeVisible();
    await expect(
      connection.getByLabel("Telefone para pareamento"),
    ).toBeVisible();
    await expect(connection.getByLabel("ID da instância")).toHaveCount(0);
    await expect(connection.getByLabel("Token da instância")).toHaveCount(0);
    await expect(connection.getByLabel("Token do cliente")).toHaveCount(0);
    await expect(connection.getByText(/webhook/i)).toHaveCount(0);
    await saveQaScreenshot(page, testInfo, "crm-whatsapp-connection-pairing");
  });
});
