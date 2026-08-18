import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmConversationCycle } from "../../../domains/crm/ports/crmConversationRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmOutcomeRepository } from "../adapters/memory/crmOutcomeRepository.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

export const storeId = "store_1" as StoreId;
export const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

export async function createConclusionFixture() {
  const crmPipelineRepository = createMemoryCrmPipelineRepository();
  const outcomeRepository = createMemoryCrmOutcomeRepository();
  const pipeline = await crmPipelineRepository.ensureDefaultPipeline({
    storeId,
    tenantId,
  });
  const openStage = pipeline.stages.find((stage) => stage.status === "open")!;
  const crmRepository = createMemoryCrmRepository();
  const lead = await crmRepository.createLead({
    assignedUserId: "seller_1" as UserId,
    buyerName: "Lead",
    pipelineId: pipeline.id,
    pipelineStageId: openStage.id,
    source: "whatsapp",
    storeId,
    tenantId,
  });
  const originId = "34000000-0000-4000-8000-000000000001";
  const otherId = "34000000-0000-4000-8000-000000000002";
  const conversationRepository = createMemoryCrmConversationRepository([
    createCycle(originId, lead.id),
    createCycle(otherId, lead.id),
  ]);
  return {
    app: createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConnection(),
      ]),
      crmPipelineRepository,
      crmOutcomeRepository: outcomeRepository,
      crmRepository,
      crmConversationRepository: conversationRepository,
    }),
    crmRepository,
    crmPipelineRepository,
    leadId: lead.id,
    openStageId: openStage.id,
    originId,
    otherId,
    outcomeRepository,
    pipeline,
    pipelineId: pipeline.id,
    conversationRepository,
  };
}

function createConnection(): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {},
    displayName: "WhatsApp",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}

function createCycle(id: string, leadId: string): CrmConversationCycle {
  const now = new Date("2026-08-13T12:00:00.000Z");
  return {
    assignedUserId: "seller_1" as UserId,
    customerChatId: null,
    customerDisplayName: "Lead",
    customerPhone: id,
    channel: "WHATSAPP",
    externalThreadId: null,
    channelMetadata: {},
    connectionId,
    createdAt: now,
    externalCycleId: null,
    firstHandledAt: now,
    freshLeadAt: now,
    humanAttendanceChangedAt: null,
    humanAttendanceState: null,
    humanAttendanceStateVersion: null,
    humanHandlingStartedAt: null,
    humanTakeoverAt: null,
    interventionId: null,
    id,
    lastAssignedAt: now,
    lastCustomerReadAt: null,
    lastMessageAt: now,
    lastMessageContent: null,
    lastReadAt: null,
    leadId,
    messageCount: 0,
    metadata: {},
    profilePhotoUrl: null,
    revision: 0,
    tags: [],
    source: "manual",
    status: "ACTIVE",
    storeId,
    tenantId,
    unreadCount: 0,
    updatedAt: now,
  };
}
