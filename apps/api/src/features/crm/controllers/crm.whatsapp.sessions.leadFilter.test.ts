import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmWhatsappSession } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp sessions linked to leads", () => {
  it("filters sessions by linked lead id inside the active CRM scope", async () => {
    const crmRepository = createMemoryCrmRepository();
    const firstLead = await crmRepository.createLead({
      buyerName: "Lead Um",
      buyerPhone: "5511911111111",
      source: "manual",
      storeId,
      tenantId,
    });
    const secondLead = await crmRepository.createLead({
      buyerName: "Lead Dois",
      buyerPhone: "5511922222222",
      source: "manual",
      storeId,
      tenantId,
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmRepository,
      crmWhatsappRepository: createMemoryCrmWhatsappRepository([
        createWhatsappSession({
          buyerName: "Lead Um",
          buyerPhone: "5511911111111",
          id: "34000000-0000-4000-8000-000000000001",
          leadId: firstLead.id,
        }),
        createWhatsappSession({
          buyerName: "Lead Dois",
          buyerPhone: "5511922222222",
          id: "34000000-0000-4000-8000-000000000002",
          leadId: secondLead.id,
        }),
      ]),
    });

    const response = await app.request(
      `/api/v1/crm/whatsapp/sessions?leadId=${firstLead.id}`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject([
      {
        buyerName: "Lead Um",
        buyerPhone: "5511911111111",
        id: "34000000-0000-4000-8000-000000000001",
        leadId: firstLead.id,
      },
    ]);
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

function createWhatsappSession(
  overrides: Partial<CrmWhatsappSession> = {},
): CrmWhatsappSession {
  const now = new Date("2026-07-06T10:00:00.000Z");
  return {
    assignedUserId: null,
    buyerChatLid: null,
    buyerName: "Ana",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    channelExternalId: null,
    channelMetadata: {},
    connectionId,
    createdAt: now,
    externalSessionId: null,
    firstHandledAt: null,
    freshLeadAt: now,
    humanTakeoverAt: null,
    id: "34000000-0000-4000-8000-000000000000",
    lastAssignedAt: null,
    lastCustomerReadAt: null,
    lastMessageAt: now,
    lastMessageContent: "Mensagem do cliente",
    lastReadAt: null,
    leadId: null,
    messageCount: 1,
    metadata: {},
    profilePhotoUrl: null,
    sessionTags: [],
    source: null,
    status: "ACTIVE",
    storeId,
    tenantId,
    unreadCount: 0,
    updatedAt: now,
    ...overrides,
  };
}
