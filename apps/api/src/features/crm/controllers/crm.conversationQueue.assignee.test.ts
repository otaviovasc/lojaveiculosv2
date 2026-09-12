import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmConversationRepository } from "../../../domains/crm/ports/crmConversationRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const brunoUserId = "03030303-0303-4303-8303-030303030303";
const carlaUserId = "04040404-0404-4404-8404-040404040404";
const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM queue assignee filter", () => {
  it("scopes the others queue to a selected store assignee", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const bruno = await ingestText(conversationRepository, {
      customerDisplayName: "Bruno",
      customerPhone: "5511999999911",
      content: "Atendimento do Bruno",
      externalId: "queue-assignee-bruno",
      providerTimestamp: new Date("2026-07-03T12:00:00.000Z"),
    });
    const carla = await ingestText(conversationRepository, {
      customerDisplayName: "Carla",
      customerPhone: "5511999999912",
      content: "Atendimento da Carla",
      externalId: "queue-assignee-carla",
      providerTimestamp: new Date("2026-07-03T12:01:00.000Z"),
    });
    await conversationRepository.updateConversationCycle({
      assignedUserId: brunoUserId as never,
      cycleId: bruno.conversationCycle.id,
      storeId,
      tenantId,
    });
    await conversationRepository.updateConversationCycle({
      assignedUserId: carlaUserId as never,
      cycleId: carla.conversationCycle.id,
      storeId,
      tenantId,
    });
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles?connectionId=${connectionId}&filter=others&assigneeId=${brunoUserId}`,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject([
      { assignedUserId: brunoUserId, customerDisplayName: "Bruno" },
    ]);
  });
});

function ingestText(
  repository: CrmConversationRepository,
  input: {
    customerDisplayName: string;
    customerPhone: string;
    content: string;
    externalId: string;
    providerTimestamp: Date;
  },
) {
  return repository.ingestMessage({
    ...input,
    channel: "WHATSAPP",
    connectionId,
    direction: "INBOUND",
    metadata: {},
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId,
    tenantId,
    type: "TEXT",
  });
}

function createZapiConnection(): CrmConnection {
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
  };
}
