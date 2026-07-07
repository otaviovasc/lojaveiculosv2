import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createAuditSpy,
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp integrations", () => {
  it("returns an unconfigured bot integration without secrets", async () => {
    const app = createTestApp();
    const response = await app.request("/api/v1/crm/whatsapp/integrations/bot");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      integration: {
        enabled: false,
        secretConfigured: false,
        webhookUrl: null,
      },
    });
  });

  it("saves bot webhook settings without returning the secret or hash", async () => {
    const { audit, record } = createAuditSpy();
    const app = createTestApp({ audit });
    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot",
      {
        body: JSON.stringify({
          enabled: true,
          webhookSecret: "bot-secret-value",
          webhookUrl: "https://bot.example.test/webhook",
        }),
        method: "PATCH",
      },
    );

    const body = (await response.json()) as {
      integration: Record<string, unknown>;
    };
    expect(response.status).toBe(200);
    expect(body.integration).toMatchObject({
      enabled: true,
      secretConfigured: true,
      webhookUrl: "https://bot.example.test/webhook",
    });
    expect(body.integration.webhookSecret).toBeUndefined();
    expect(body.integration.webhookSecretHash).toBeUndefined();
    expect(JSON.stringify(record.mock.calls)).not.toContain("bot-secret-value");
  });

  it("does not enable bot forwarding until URL and secret are configured", async () => {
    const app = createTestApp();
    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot",
      {
        body: JSON.stringify({ enabled: true }),
        method: "PATCH",
      },
    );

    expect(response.status).toBe(422);
    await expectApiError(response, {
      code: "CRM_WHATSAPP_BOT_INTEGRATION_INCOMPLETE",
      message:
        "Bot integration requires a webhook URL and secret before enabling.",
    });
  });

  it("requires the integrations manage permission", async () => {
    const app = createTestApp({ permissions: ["crm.whatsapp.read"] });
    const response = await app.request("/api/v1/crm/whatsapp/integrations/bot");

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing permission: crm.whatsapp.integrations.manage",
    });
  });

  it("authenticates bot actions with the write-only webhook secret", async () => {
    const { audit, record } = createAuditSpy();
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      audit,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
    });
    await configureBot(app);

    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonPost(
        {
          action: "create_tag",
          connectionId,
          payload: { color: "#16a34a", name: "Quente" },
        },
        { "X-Webhook-Secret": "bot-secret-value" },
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      action: "create_tag",
      result: { name: "Quente" },
      success: true,
    });
    expect(JSON.stringify(record.mock.calls)).not.toContain("bot-secret-value");
  });

  it("rejects bot actions with an invalid webhook secret", async () => {
    const app = createTestApp();
    await configureBot(app);

    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonPost({ action: "list_tags" }, { "X-Webhook-Secret": "wrong-secret" }),
    );

    expect(response.status).toBe(401);
    await expectApiError(response, {
      code: "CRM_WHATSAPP_BOT_UNAUTHORIZED",
      message: "Bot action request is not authorized.",
    });
  });

  it("blocks bot sends during human takeover", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await whatsappRepository.ingestMessage({
      buyerName: "Ana",
      buyerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId,
      content: "Quero falar com uma pessoa",
      direction: "INBOUND",
      externalId: "bot-action-inbound-1",
      metadata: {},
      providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    await whatsappRepository.updateSession({
      humanTakeoverAt: new Date("2026-07-02T19:01:00.000Z"),
      sessionId: inbound.session.id,
      status: "HUMAN_TAKEOVER",
      storeId,
      tenantId,
    });
    const sendText = vi.fn();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: whatsappRepository,
    });
    await configureBot(app);

    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonPost(
        {
          action: "send_text",
          payload: { text: "Resposta automatica" },
          sessionId: inbound.session.id,
        },
        { "X-Webhook-Secret": "bot-secret-value" },
      ),
    );

    expect(response.status).toBe(409);
    await expectApiError(response, {
      code: "CRM_WHATSAPP_BOT_ACTION_BLOCKED",
      message: "Bot sends are blocked while human takeover is active.",
    });
    expect(sendText).not.toHaveBeenCalled();
  });
});

async function configureBot(app: ReturnType<typeof createTestApp>) {
  const response = await app.request(
    "/api/v1/crm/whatsapp/integrations/bot",
    jsonPost(
      {
        enabled: true,
        webhookSecret: "bot-secret-value",
        webhookUrl: "https://bot.example.test/webhook",
      },
      undefined,
      "PATCH",
    ),
  );
  expect(response.status).toBe(200);
}

function jsonPost(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
  method = "POST",
) {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
    method,
  };
}

function createZapiConnection(): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
