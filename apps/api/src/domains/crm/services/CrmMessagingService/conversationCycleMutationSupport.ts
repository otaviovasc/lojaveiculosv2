import type { UserId } from "@lojaveiculosv2/shared";
import type { CrmConversationCycle } from "../../ports/crmConversationRepository.js";
import {
  CrmConnectionNotFoundError,
  ConversationCycleNotFoundError,
} from "../../messaging/crmMessagingErrors.js";
import { CrmScopeError } from "../../crmScopeError.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { getCrmConnectionMemberRepository } from "../CrmConnectionMemberService/connectionMemberSupport.js";
import { resolveCrmConnectionScopedQueueVisibility } from "../../messaging/crmQueueVisibility.js";

export async function resolveScopedConversationCycle(
  context: ServiceContext,
  input: { cycleId: string },
  ports: CrmServicePorts,
  options: { includeArchived?: boolean; includeDeleted?: boolean } = {},
) {
  const scope = requireCrmMessagingScope(context);
  const [conversationCycle] = await getCrmConversationRepository(
    ports,
  ).listConversationCycles({
    limit: 1,
    offset: 0,
    queueVisibility: await resolveCrmConnectionScopedQueueVisibility(
      context,
      ports,
    ),
    ...(options.includeArchived ? { includeArchived: true } : {}),
    ...(options.includeDeleted ? { includeDeleted: true } : {}),
    cycleId: input.cycleId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  return { scope, conversationCycle: conversationCycle ?? null };
}

export async function findScopedConversationCycle(
  context: ServiceContext,
  input: { cycleId: string },
  ports: CrmServicePorts,
  options: { includeArchived?: boolean; includeDeleted?: boolean } = {},
) {
  const { scope, conversationCycle } = await resolveScopedConversationCycle(
    context,
    input,
    ports,
    options,
  );
  if (!conversationCycle)
    throw new ConversationCycleNotFoundError(input.cycleId);
  return { scope, conversationCycle };
}

export async function findOutboundConversationCycle(
  context: ServiceContext,
  input: { cycleId: string },
  ports: CrmServicePorts,
) {
  const scope = requireCrmMessagingScope(context);
  const [conversationCycle] = await getCrmConversationRepository(
    ports,
  ).listConversationCycles({
    limit: 1,
    offset: 0,
    cycleId: input.cycleId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!conversationCycle)
    throw new ConversationCycleNotFoundError(input.cycleId);

  if (context.permissions.includes("crm.conversations.assign")) {
    return { requiresAssignment: false, scope, conversationCycle };
  }
  if (context.actor.kind === "system" || context.actor.kind === "integration") {
    return { requiresAssignment: false, scope, conversationCycle };
  }
  if (context.actor.kind !== "user") {
    throw new ConversationCycleNotFoundError(input.cycleId);
  }
  if (
    conversationCycle.assignedUserId !== null &&
    conversationCycle.assignedUserId !== context.actor.id
  ) {
    throw new ConversationCycleNotFoundError(input.cycleId);
  }
  if (
    context.actor.kind === "user" &&
    !context.permissions.includes("crm.conversations.assign")
  ) {
    let memberRepository;
    try {
      memberRepository = getCrmConnectionMemberRepository(ports);
    } catch (error) {
      if (error instanceof CrmScopeError) {
        throw new ConversationCycleNotFoundError(input.cycleId);
      }
      throw error;
    }
    const allowedConnectionIds =
      await memberRepository.listConnectionIdsForUser({
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
        userId: context.actor.id as UserId,
      });
    if (!allowedConnectionIds.includes(conversationCycle.connectionId)) {
      throw new ConversationCycleNotFoundError(input.cycleId);
    }
  }
  return {
    requiresAssignment: conversationCycle.assignedUserId === null,
    scope,
    conversationCycle,
  };
}

export async function sessionWithConnection(
  conversationCycle: CrmConversationCycle | null,
  ports: CrmServicePorts,
  cycleId: string,
): Promise<CrmConversationCycle> {
  if (!conversationCycle) throw new ConversationCycleNotFoundError(cycleId);
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    conversationCycle.connectionId,
  );
  if (
    !connection ||
    connection.storeId !== conversationCycle.storeId ||
    connection.tenantId !== conversationCycle.tenantId
  ) {
    throw new CrmConnectionNotFoundError(conversationCycle.connectionId);
  }
  return conversationCycle;
}
