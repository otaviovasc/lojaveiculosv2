import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import {
  createConfiguredZapiTestConnection,
  withTestZapiWebhookToken,
} from "./crm.whatsapp.connectionFixtures.js";
import {
  configureBot,
  connectionId,
  createBotDispatcher,
  jsonRequest,
} from "./crm.whatsapp.botForwarding.testSupport.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

describe("CRM WhatsApp bot outbound parity", () => {
  it("forwards ZAPI connection status changes to the configured bot", async () => {
    const dispatched: Array<{ payload: Record<string, unknown> }> = [];
    const app = createBotActionApp({
      crmBotWebhookDispatcher: createBotDispatcher(dispatched as never),
    });
    await configureBot(app);

    const response = await app.request(
      `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/connected`,
      jsonRequest(
        { connected: true, connectedPhone: "5511888887777" },
        withTestZapiWebhookToken(),
      ),
    );

    expect(response.status).toBe(200);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]?.payload).toMatchObject({
      connection: { phone: "5511888887777", status: "active" },
      event: "connection_status_changed",
      previousStatus: "active",
      reason: "connected",
      status: "active",
    });
    expect(dispatched[0]?.payload).not.toHaveProperty("chat");
    expect(dispatched[0]?.payload).not.toHaveProperty("session");
  });
});

function createBotActionApp(options: Parameters<typeof createTestApp>[0] = {}) {
  return createTestApp({
    crmConnectionRepository: createMemoryCrmConnectionRepository([
      createZapiConnection(),
    ]),
    ...options,
  });
}

function createZapiConnection(): CrmConnection {
  return createConfiguredZapiTestConnection({
    id: connectionId,
    overrides: { phone: "5511999999999" },
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  });
}
