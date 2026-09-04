import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  type CrmConversationCycle,
  type CrmTag,
} from "../../ports/crmConversationRepository.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  publishConversationCycleUpdate,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import {
  findScopedConversationCycle,
  sessionWithConnection,
} from "./conversationCycleMutationSupport.js";

export {
  createCrmTag,
  deleteCrmTag,
  reorderCrmTags,
  updateCrmTag,
} from "./crmTagManagement.js";
export type {
  CreateCrmTagInput,
  DeleteCrmTagInput,
  ReorderCrmTagsInput,
  UpdateCrmTagInput,
} from "./crmTagManagement.js";

const tagAssignPermission = "crm.tags.assign";

export type AddConversationCycleTagInput = {
  color?: string;
  emoji?: string | null;
  name: string;
  cycleId: string;
};

export type ListCrmTagsInput = {
  connectionId?: string | null;
  limit?: number;
  search?: string;
};

export type RemoveConversationCycleTagInput = {
  cycleId: string;
  tagId: string;
};

export async function listCrmTags(
  context: ServiceContext,
  input: ListCrmTagsInput,
  ports: CrmServicePorts,
): Promise<readonly CrmTag[]> {
  assertPermission(context, "crm.conversations.read");
  const scope = requireCrmMessagingScope(context);
  return getCrmConversationRepository(ports).listTags({
    ...(input.connectionId !== undefined
      ? { connectionId: input.connectionId }
      : {}),
    limit: input.limit ?? 100,
    ...(input.search ? { search: input.search } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
}

export async function addConversationCycleTag(
  context: ServiceContext,
  input: AddConversationCycleTagInput,
  ports: CrmServicePorts,
): Promise<CrmConversationCycle> {
  assertPermission(context, tagAssignPermission);
  const name = input.name.trim();
  logCrmServiceEvent(context, "crm.conversation_cycle.tag.add.started", {
    name,
    cycleId: input.cycleId,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.conversation_cycle.tag.add",
      category: "data_change",
      entityId: input.cycleId,
      entityType: "crm_conversation_cycle",
      metadata: { name },
      permission: tagAssignPermission,
      summary: "Added CRM WhatsApp conversationCycle tag",
    },
    () => performAddConversationCycleTag(context, { ...input, name }, ports),
  );
}

export async function removeConversationCycleTag(
  context: ServiceContext,
  input: RemoveConversationCycleTagInput,
  ports: CrmServicePorts,
): Promise<CrmConversationCycle> {
  assertPermission(context, tagAssignPermission);
  logCrmServiceEvent(context, "crm.conversation_cycle.tag.remove.started", {
    cycleId: input.cycleId,
    tagId: input.tagId,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.conversation_cycle.tag.remove",
      category: "data_change",
      entityId: input.cycleId,
      entityType: "crm_conversation_cycle",
      metadata: { tagId: input.tagId },
      permission: tagAssignPermission,
      summary: "Removed CRM WhatsApp conversationCycle tag",
    },
    () => performRemoveConversationCycleTag(context, input, ports),
  );
}

async function performAddConversationCycleTag(
  context: ServiceContext,
  input: AddConversationCycleTagInput,
  ports: CrmServicePorts,
) {
  const scope = requireCrmMessagingScope(context);
  const updated = await runCrmTransaction(ports, async (transactionPorts) => {
    const { conversationCycle } = await findScopedConversationCycle(
      context,
      { cycleId: input.cycleId },
      transactionPorts,
    );
    const repository = getCrmConversationRepository(transactionPorts);
    const tag = await repository.findOrCreateTag({
      color: input.color ?? "#64748b",
      connectionId: conversationCycle.connectionId,
      emoji: input.emoji ?? null,
      name: input.name,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    return repository.addConversationCycleTag({
      cycleId: input.cycleId,
      storeId: scope.storeId as never,
      tagId: tag.id,
      tenantId: scope.tenantId as never,
    });
  });
  const realtimeSession = await sessionWithConnection(
    updated,
    ports,
    input.cycleId,
  );
  await publishConversationCycleUpdate(ports, realtimeSession, scope);
  return realtimeSession;
}

async function performRemoveConversationCycleTag(
  context: ServiceContext,
  input: RemoveConversationCycleTagInput,
  ports: CrmServicePorts,
) {
  const scope = requireCrmMessagingScope(context);
  const updated = await runCrmTransaction(ports, async (transactionPorts) => {
    await findScopedConversationCycle(
      context,
      { cycleId: input.cycleId },
      transactionPorts,
    );
    return getCrmConversationRepository(
      transactionPorts,
    ).removeConversationCycleTag({
      cycleId: input.cycleId,
      storeId: scope.storeId as never,
      tagId: input.tagId,
      tenantId: scope.tenantId as never,
    });
  });
  const realtimeSession = await sessionWithConnection(
    updated,
    ports,
    input.cycleId,
  );
  await publishConversationCycleUpdate(ports, realtimeSession, scope);
  return realtimeSession;
}
