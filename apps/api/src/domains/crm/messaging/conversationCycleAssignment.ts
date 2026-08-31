import type {
  CrmConversationCycle,
  CrmInterventionActorKind,
} from "../ports/crmConversationRepository.js";
import {
  getCrmAssigneeMembershipRepository,
  getCrmRepository,
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { AuthorizationError } from "../../../shared/authorization.js";
import { reloadScopedConversationCycle } from "../services/CrmMessagingService/executeCrmConversationCycleCommand.js";
import { transitionHumanAttendance } from "./humanAttendanceTransition.js";

export type ConversationCycleAssignmentResult = {
  previousAssignedUserId?: string;
  result: "already_applied" | "applied" | "superseded";
  conversationCycle: CrmConversationCycle;
};

export async function applyConversationCycleAssignment(input: {
  actorId: string;
  actorKind: CrmInterventionActorKind;
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
  const conversationRepository = getCrmConversationRepository(input.ports);
  let current = input.initialSession;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (current.assignedUserId === input.assignedUserId) {
      return { result: "already_applied", conversationCycle: current };
    }
    if (current.assignedUserId !== null && !input.allowReassignment) {
      return { result: "superseded", conversationCycle: current };
    }
    let updated: CrmConversationCycle | null;
    if (
      input.assignedUserId === null &&
      current.humanAttendanceState === "IN_HUMAN_SERVICE"
    ) {
      const transition = await transitionHumanAttendance({
        actorId: input.actorId,
        actorKind: input.actorKind,
        command: {
          kind: "release",
          reason: "assignee_removed",
          source: "crm_assignment",
        },
        conversationCycle: current,
        now: input.assignedAt,
        repository: conversationRepository,
      });
      if (!transition.changed) {
        current = transition.conversationCycle;
        continue;
      }
      updated = transition.conversationCycle;
    } else {
      updated = await conversationRepository.updateConversationCycle({
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
    }
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
