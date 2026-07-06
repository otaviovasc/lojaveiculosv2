import type { Page } from "@playwright/test";

export async function installProviderEventIssueRoutes(page: Page) {
  let retried = false;
  await page.route("**/provider-events/issues**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ events: retried ? [] : [providerEventIssue()] }),
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
  await page.route("**/provider-events/event_e2e/retry", async (route) => {
    retried = true;
    await route.fulfill({
      body: JSON.stringify({
        event: { ...providerEventIssue(), status: "processed" },
        result: { status: "accepted" },
      }),
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
}

function providerEventIssue() {
  return {
    connectionId: "24000000-0000-4000-8000-000000000101",
    createdAt: new Date().toISOString(),
    errorMessage: "timeout na entrega",
    eventType: "crm.whatsapp.zapi.delivery",
    id: "event_e2e",
    processedAt: null,
    providerEventId: "provider_event_e2e",
    status: "failed",
    updatedAt: new Date().toISOString(),
    webhookType: "delivery",
  };
}
