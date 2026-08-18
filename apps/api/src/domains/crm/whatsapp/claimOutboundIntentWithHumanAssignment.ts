import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  ClaimOutboundIntentResult,
  CrmWhatsappOutboundIntentRepository,
} from "../ports/crmWhatsappOutboundIntentRepository.js";
import type {
  CrmWhatsappMessageSenderOrigin,
  CrmWhatsappMessageSenderType,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";
import {
  getCrmWhatsappOutboundIntentRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import type { WhatsappSessionAssignmentResult } from "./whatsappSessionAssignment.js";
import {
  applyHumanOutboundAssignment,
  auditHumanCrmOutboundAssignment,
  shouldAutoAssignHumanCrmOutbound,
} from "./autoAssignHumanCrmOutbound.js";
import { WhatsappSessionNotFoundError } from "./whatsappSendErrors.js";

type ClaimAndAssignmentInput = {
  claim: Parameters<CrmWhatsappOutboundIntentRepository["claim"]>[0];
  context: ServiceContext;
  ports: CrmServicePorts;
  providerTimestamp: Date;
  requiredForAccess?: boolean;
  scope: { storeId: string; tenantId: string };
  senderOrigin: CrmWhatsappMessageSenderOrigin;
  senderType: CrmWhatsappMessageSenderType;
  session: CrmWhatsappSession;
};

export async function claimOutboundIntentWithHumanAssignment(
  input: ClaimAndAssignmentInput,
): Promise<{
  assignment: WhatsappSessionAssignmentResult | null;
  claimed: ClaimOutboundIntentResult;
  session: CrmWhatsappSession;
}> {
  let attemptedIntentId: string | null = null;
  try {
    const state = await runCrmTransaction(input.ports, async (ports) => {
      const claimed = await getCrmWhatsappOutboundIntentRepository(ports).claim(
        input.claim,
      );
      if (claimed.kind === "conflict" || !shouldApplyAssignment(input)) {
        return { assignment: null, claimed, session: input.session };
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
      assertRequiredAssignment(input, assignment.session);
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
  session: CrmWhatsappSession,
) {
  if (
    input.requiredForAccess &&
    session.assignedUserId !== input.context.actor.id
  ) {
    throw new WhatsappSessionNotFoundError(input.session.id);
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
    sessionId: input.session.id,
  };
}
