import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  ClaimOutboundIntentResult,
  CrmOutboundIntentRepository,
} from "../ports/crmOutboundIntentRepository.js";
import type {
  CrmMessageSenderOrigin,
  CrmMessageSenderType,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";
import {
  getCrmOutboundIntentRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import type { ConversationCycleAssignmentResult } from "./conversationCycleAssignment.js";
import {
  applyHumanOutboundAssignment,
  auditHumanCrmOutboundAssignment,
  shouldAutoAssignHumanCrmOutbound,
} from "./autoAssignHumanCrmOutbound.js";
import { ConversationCycleNotFoundError } from "./crmMessagingErrors.js";

type ClaimAndAssignmentInput = {
  claim: Parameters<CrmOutboundIntentRepository["claim"]>[0];
  context: ServiceContext;
  ports: CrmServicePorts;
  providerTimestamp: Date;
  requiredForAccess?: boolean;
  scope: { storeId: string; tenantId: string };
  senderOrigin: CrmMessageSenderOrigin;
  senderType: CrmMessageSenderType;
  conversationCycle: CrmConversationCycle;
};

export async function claimOutboundIntentWithHumanAssignment(
  input: ClaimAndAssignmentInput,
): Promise<{
  assignment: ConversationCycleAssignmentResult | null;
  claimed: ClaimOutboundIntentResult;
  conversationCycle: CrmConversationCycle;
}> {
  let attemptedIntentId: string | null = null;
  try {
    const state = await runCrmTransaction(input.ports, async (ports) => {
      const claimed = await getCrmOutboundIntentRepository(ports).claim(
        input.claim,
      );
      if (claimed.kind === "conflict" || !shouldApplyAssignment(input)) {
        return {
          assignment: null,
          claimed,
          conversationCycle: input.conversationCycle,
        };
      }
      attemptedIntentId = claimed.intent.id;
      await auditHumanCrmOutboundAssignment(
        input.context,
        auditInput(input, claimed.intent.id, "attempted"),
        "attempted",
      );
      const assignment = await applyHumanOutboundAssignment({
        ...input,
        outboundIntentId: claimed.intent.id,
        ports,
      });
      assertRequiredAssignment(input, assignment.conversationCycle);
      return { ...assignment, claimed };
    });
    if (state.assignment) {
      await auditHumanCrmOutboundAssignment(input.context, {
        ...auditInput(input, state.claimed.intent.id),
        assignment: state.assignment,
      });
    }
    return state;
  } catch (error) {
    if (attemptedIntentId) {
      await auditHumanCrmOutboundAssignment(
        input.context,
        auditInput(input, attemptedIntentId, "failed", error),
        "failed",
      );
    }
    throw error;
  }
}

function shouldApplyAssignment(input: ClaimAndAssignmentInput) {
  return input.requiredForAccess || shouldAutoAssignHumanCrmOutbound(input);
}

function assertRequiredAssignment(
  input: ClaimAndAssignmentInput,
  conversationCycle: CrmConversationCycle,
) {
  if (
    input.requiredForAccess &&
    conversationCycle.assignedUserId !== input.context.actor.id
  ) {
    throw new ConversationCycleNotFoundError(input.conversationCycle.id);
  }
}

function auditInput(
  input: ClaimAndAssignmentInput,
  outboundIntentId: string,
  result?: "attempted" | "failed",
  error?: unknown,
) {
  return {
    ...(error
      ? { errorName: error instanceof Error ? error.name : "UnknownError" }
      : {}),
    outboundIntentId,
    ...(result ? { result } : {}),
    senderOrigin: input.senderOrigin,
    senderType: input.senderType,
    cycleId: input.conversationCycle.id,
  };
}
