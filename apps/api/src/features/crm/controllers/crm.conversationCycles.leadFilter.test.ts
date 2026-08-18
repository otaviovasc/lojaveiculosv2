import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmConversationCycle } from "../../../domains/crm/ports/crmConversationRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM cycles linked to leads", () => {
  it("filters cycles by linked lead id inside the active CRM scope", async () => {
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
      crmConversationRepository: createMemoryCrmConversationRepository([
        createCrmConversationCycle({
          customerDisplayName: "Lead Um",
          customerPhone: "5511911111111",
          id: "34000000-0000-4000-8000-000000000001",
          leadId: firstLead.id,
        }),
        createCrmConversationCycle({
          customerDisplayName: "Lead Dois",
          customerPhone: "5511922222222",
          id: "34000000-0000-4000-8000-000000000002",
          leadId: secondLead.id,
        }),
      ]),
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles?leadId=${firstLead.id}`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject([
      {
        customerDisplayName: "Lead Um",
        customerPhone: "5511911111111",
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
    broker: "direct",
    channel: "whatsapp",
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

function createCrmConversationCycle(
  overrides: Partial<CrmConversationCycle> = {},
): CrmConversationCycle {
  const now = new Date("2026-07-06T10:00:00.000Z");
  return {
    assignedUserId: null,
    customerChatId: null,
    customerDisplayName: "Ana",
    customerPhone: "5511999999999",
    channel: "WHATSAPP",
    externalThreadId: null,
    channelMetadata: {},
    connectionId,
    createdAt: now,
    externalCycleId: null,
    firstHandledAt: null,
    freshLeadAt: now,
    humanAttendanceChangedAt: null,
    humanAttendanceState: null,
    humanAttendanceStateVersion: null,
    humanHandlingStartedAt: null,
    humanTakeoverAt: null,
    interventionId: null,
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
    revision: 0,
    tags: [],
    source: null,
    status: "ACTIVE",
    storeId,
    tenantId,
    unreadCount: 0,
    updatedAt: now,
    ...overrides,
  };
}
