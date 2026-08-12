import { describe, expect, it, vi } from "vitest";
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
import {
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

const legacyBotActionsPath = "/api/v1/crm/whatsapp/integrations/bot/actions";
const gone = {
  code: "CRM_WHATSAPP_LEGACY_BOT_ACTIONS_GONE",
  message: "Use POST /api/v1/crm/bot/actions with a one-time capability grant.",
} as const;

describe("CRM WhatsApp bot outbound parity", () => {
  it("does not start a bot-authored conversation through the legacy route", async () => {
    const sendText = vi.fn();
    const dispatch = vi.fn();
    const app = createBotActionApp({
      crmBotWebhookDispatcher: createBotDispatcher([]),
      crmWhatsappGateway: { sendText },
    });
    await configureBot(app);

    const response = await app.request(
      legacyBotActionsPath,
      jsonRequest(
        {
          action: "send_text",
          connectionId,
          payload: { phone: "5511999999999", text: "Resposta automatica" },
        },
        { "X-Webhook-Secret": "bot-webhook-secret-value-32-characters" },
      ),
    );

    expect(response.status).toBe(410);
    await expectApiError(response, gone);
    expect(sendText).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not bypass human takeover through the legacy route", async () => {
    const sendText = vi.fn();
    const dispatch = vi.fn();
    const app = createBotActionApp({
      crmBotWebhookDispatcher: {
        actionApiBaseUrl: "https://api.example.test",
        dispatch,
      },
      crmWhatsappGateway: { sendText },
    });
    await configureBot(app);

    const response = await app.request(
      legacyBotActionsPath,
      jsonRequest(
        {
          action: "send_text",
          connectionId,
          payload: { phone: "5511999999999", text: "Nao enviar" },
        },
        { "X-Webhook-Secret": "bot-webhook-secret-value-32-characters" },
      ),
    );

    expect(response.status).toBe(410);
    await expectApiError(response, gone);
    expect(sendText).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

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
