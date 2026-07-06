import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp start conversation from lead", () => {
  it("starts a conversation from an existing V2 lead id", async () => {
    const crmRepository = createMemoryCrmRepository();
    const existing = await crmRepository.createLead({
      buyerName: "Lead V2",
      buyerPhone: "5511977776666",
      source: "manual",
      storeId,
      tenantId,
    });
    const sendText = vi.fn(async () => ({
      externalId: "zapi-start-lead-id",
      providerTimestamp: new Date("2026-07-03T15:07:00.000Z"),
      raw: { messageId: "zapi-start-lead-id" },
    }));
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository,
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: createMemoryCrmWhatsappRepository(),
    });

    const response = await app.request(
      "/api/v1/crm/whatsapp/conversations/start",
      {
        body: JSON.stringify({
          connectionId,
          leadId: existing.id,
          text: "Mensagem pelo lead.",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      lead: { id: existing.id, status: "contacted" },
      session: {
        buyerName: "Lead V2",
        buyerPhone: "5511977776666",
        leadId: existing.id,
      },
    });
    expect(sendText).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ phone: "5511977776666" }),
    );
  });
});

function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
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
    ...overrides,
  };
}
