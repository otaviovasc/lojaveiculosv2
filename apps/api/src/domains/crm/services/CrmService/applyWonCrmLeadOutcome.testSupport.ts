import { vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmLeadOutcome,
  CrmOutcomeRepository,
} from "../../ports/crmOutcomeRepository.js";
import type { CrmConversationCycle } from "../../ports/crmConversationRepository.js";
import type { CrmLead, CrmRepository } from "../../ports/crmRepository.js";
import type { CrmServicePorts } from "./serviceSupport.js";

const storeId = "store-1";
const tenantId = "tenant-1";

export function createWonLeadOutcomeFixture() {
  const context = createServiceContext({
    actor: { id: "actor-1", kind: "user" },
    permissions: ["sale.close"],
    request: { requestId: "request-1" },
    storeId,
    tenantId,
  });
  const lead = crmLead();
  const cycle = conversationCycle(lead.id);
  const outcomes: CrmLeadOutcome[] = [];
  const createOutcome: CrmOutcomeRepository["create"] = async (input) => {
    const outcome: CrmLeadOutcome = {
      ...input,
      createdAt: new Date("2026-08-18T12:00:00.000Z"),
      id: `outcome-${outcomes.length + 1}`,
    };
    outcomes.push(outcome);
    return outcome;
  };
  const outcomeRepository: CrmOutcomeRepository = {
    create: vi.fn(createOutcome),
    findByCommandId: vi.fn(async () => null),
    lockLead: vi.fn(async () => undefined),
  };
  const updateLead: CrmRepository["updateLead"] = async (input) => ({
    ...lead,
    pipelineId: input.pipelineId ?? lead.pipelineId,
    pipelineStageId: input.pipelineStageId ?? lead.pipelineStageId,
    status: input.status ?? lead.status,
  });
  const ports = {
    crmConnectionRepository: {
      findConnectionById: vi.fn(async () => ({ storeId, tenantId })),
    } as never,
    crmConversationRepository: {
      listConversationCycles: vi.fn(async () => [cycle]),
      updateConversationCycle: vi.fn(async () => ({
        ...cycle,
        revision: cycle.revision + 1,
        status: "COMPLETED" as const,
      })),
    } as never,
    crmOutcomeRepository: outcomeRepository,
    crmPipelineRepository: pipelineRepository(),
    crmRepository: {
      findLeadById: vi.fn(async () => lead),
      updateLead: vi.fn(updateLead),
    } as never,
  } satisfies CrmServicePorts;

  return { context, cycle, lead, ports };
}

function pipelineRepository(): NonNullable<
  CrmServicePorts["crmPipelineRepository"]
> {
  const now = new Date("2026-08-18T12:00:00.000Z");
  const pipeline = {
    createdAt: now,
    description: "",
    id: "pipeline-1",
    isDefault: true,
    name: "Principal",
    rotationActive: false,
    stages: [
      {
        color: "blue",
        createdAt: now,
        id: "stage-open",
        isSystem: true,
        leadStatus: "negotiating" as const,
        name: "Aberto",
        pipelineId: "pipeline-1",
        slaDays: null,
        sortOrder: 0,
        status: "open" as const,
        storeId: storeId as never,
        tenantId: tenantId as never,
        updatedAt: now,
      },
      {
        color: "green",
        createdAt: now,
        id: "stage-won",
        isSystem: true,
        leadStatus: "won" as const,
        name: "Ganho",
        pipelineId: "pipeline-1",
        slaDays: null,
        sortOrder: 1,
        status: "won" as const,
        storeId: storeId as never,
        tenantId: tenantId as never,
        updatedAt: now,
      },
      {
        color: "red",
        createdAt: now,
        id: "stage-lost",
        isSystem: true,
        leadStatus: "lost" as const,
        name: "Perdido",
        pipelineId: "pipeline-1",
        slaDays: null,
        sortOrder: 2,
        status: "lost" as const,
        storeId: storeId as never,
        tenantId: tenantId as never,
        updatedAt: now,
      },
    ],
    storeId: storeId as never,
    tenantId: tenantId as never,
    updatedAt: now,
  };
  return {
    createPipeline: vi.fn(),
    deletePipeline: vi.fn(),
    ensureDefaultPipeline: vi.fn(async () => pipeline),
    findPipelineById: vi.fn(async () => pipeline),
    findPipelineByName: vi.fn(async () => pipeline),
    findStageById: vi.fn(async () => null),
    listPipelines: vi.fn(async () => [pipeline]),
    updatePipeline: vi.fn(async () => pipeline),
  };
}

function crmLead(): CrmLead {
  const now = new Date("2026-08-18T12:00:00.000Z");
  return {
    assignedUserId: null,
    buyerEmail: null,
    buyerName: "Cliente",
    buyerPhone: "5511999999999",
    createdAt: now,
    id: "lead-1",
    lastInteractionAt: now,
    listingId: null,
    metadata: {},
    pipelineId: "pipeline-1",
    pipelineStageId: "stage-open",
    source: "whatsapp",
    status: "negotiating",
    storeId: storeId as never,
    tenantId: tenantId as never,
    updatedAt: now,
    vehicleTitle: null,
  };
}

function conversationCycle(leadId: string): CrmConversationCycle {
  const now = new Date("2026-08-18T12:00:00.000Z");
  return {
    archivedAt: null,
    assignedUserId: null,
    channel: "WHATSAPP",
    channelMetadata: {},
    connectionId: "connection-1",
    createdAt: now,
    customerChatId: null,
    deletedAt: null,
    customerDisplayName: "Cliente",
    customerPhone: "5511999999999",
    externalCycleId: null,
    externalThreadId: null,
    firstHandledAt: null,
    freshLeadAt: null,
    humanAttendanceChangedAt: null,
    humanAttendanceState: null,
    humanAttendanceStateVersion: null,
    humanHandlingStartedAt: null,
    humanTakeoverAt: null,
    id: "cycle-1",
    interventionId: null,
    lastAssignedAt: null,
    lastCustomerReadAt: null,
    lastMessageAt: now,
    lastMessageContent: "Olá",
    lastReadAt: null,
    leadId,
    messageCount: 1,
    metadata: {},
    pinnedAt: null,
    profilePhotoUrl: null,
    revision: 1,
    source: "whatsapp",
    status: "ACTIVE",
    storeId: storeId as never,
    tags: [],
    tenantId: tenantId as never,
    unreadCount: 0,
    updatedAt: now,
  };
}
