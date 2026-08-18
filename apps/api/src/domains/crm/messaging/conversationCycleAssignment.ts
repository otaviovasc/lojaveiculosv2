import type { CrmConversationCycle } from "../ports/crmConversationRepository.js";
import {
  getCrmAssigneeMembershipRepository,
  getCrmRepository,
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { AuthorizationError } from "../../../shared/authorization.js";
import { reloadScopedConversationCycle } from "../services/CrmMessagingService/executeCrmConversationCycleCommand.js";

export type ConversationCycleAssignmentResult = {
  previousAssignedUserId?: string;
  result: "already_applied" | "applied" | "superseded";
  conversationCycle: CrmConversationCycle;
};

export async function applyConversationCycleAssignment(input: {
  allowReassignment: boolean;
  assignedAt: Date;
  assignedUserId: string | null;
  initialSession: CrmConversationCycle;
  ports: CrmServicePorts;
  scope: { storeId: string; tenantId: string };
}): Promise<ConversationCycleAssignmentResult> {
  if (input.assignedUserId !== null) {
    const eligible = await getCrmAssigneeMembershipRepository(
      input.ports,
    ).isActiveStoreMember({
      storeId: input.scope.storeId as never,
      tenantId: input.scope.tenantId as never,
      userId: input.assignedUserId as never,
    });
    if (!eligible) {
      throw new AuthorizationError(
        "CRM assignee is not available for this store.",
      );
    }
  }
  let current = input.initialSession;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (current.assignedUserId === input.assignedUserId) {
      return { result: "already_applied", conversationCycle: current };
    }
    if (current.assignedUserId !== null && !input.allowReassignment) {
      return { result: "superseded", conversationCycle: current };
    }
    const updated = await getCrmConversationRepository(
      input.ports,
    ).updateConversationCycle({
      assignedUserId: input.assignedUserId as never,
      expectedRevision: current.revision,
      ...(input.assignedUserId
        ? {
            firstHandledAt: current.firstHandledAt ?? input.assignedAt,
            lastAssignedAt: input.assignedAt,
          }
        : {}),
      cycleId: current.id,
      storeId: input.scope.storeId as never,
      tenantId: input.scope.tenantId as never,
    });
    if (updated) {
      if (current.leadId) {
        await getCrmRepository(input.ports).updateLead({
          assignedUserId: input.assignedUserId as never,
          leadId: current.leadId,
          storeId: input.scope.storeId as never,
          tenantId: input.scope.tenantId as never,
        });
      }
      return {
        ...(current.assignedUserId
          ? { previousAssignedUserId: current.assignedUserId }
          : {}),
        result: "applied",
        conversationCycle: updated,
      };
    }
    current = await reloadScopedConversationCycle(
      input.ports,
      current.id,
      input.scope,
    );
  }
  return { result: "superseded", conversationCycle: current };
}
