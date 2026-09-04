import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  CrmMessageSenderOrigin,
  CrmMessageSenderType,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";
import type { ConversationCycleAssignmentResult } from "./conversationCycleAssignment.js";
import {
  runCrmTransaction,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { applyConversationCycleAssignment } from "./conversationCycleAssignment.js";
import { auditCrmServiceEvent } from "../services/CrmMessagingService/serviceSupport.js";
import { ConversationCycleNotFoundError } from "./crmMessagingErrors.js";
import { interventionActorKind } from "./humanAttendanceTransition.js";

export function shouldAutoAssignHumanCrmOutbound(input: {
  senderOrigin: CrmMessageSenderOrigin;
  senderType: CrmMessageSenderType;
}) {
  return input.senderType === "HUMAN" && input.senderOrigin === "human_crm";
}

export async function autoAssignHumanCrmOutbound(input: {
  context: ServiceContext;
  outboundIntentId: string;
  ports: CrmServicePorts;
  providerTimestamp: Date;
  requiredForAccess?: boolean;
  scope: { storeId: string; tenantId: string };
  senderOrigin: CrmMessageSenderOrigin;
  senderType: CrmMessageSenderType;
  conversationCycle: CrmConversationCycle;
}) {
  if (!shouldApplyHumanOutboundAssignment(input)) {
    return { assignment: null, conversationCycle: input.conversationCycle };
  }
  await auditHumanCrmOutboundAssignment(
    input.context,
    {
      outboundIntentId: input.outboundIntentId,
      result: "attempted",
      senderOrigin: input.senderOrigin,
      senderType: input.senderType,
      cycleId: input.conversationCycle.id,
    },
    "attempted",
  );
  try {
    const state = await runCrmTransaction(input.ports, (transactionPorts) =>
      applyHumanOutboundAssignment({ ...input, ports: transactionPorts }).then(
        (assignment) => {
          assertRequiredHumanOutboundAssignment(
            input,
            assignment.conversationCycle,
          );
          return assignment;
        },
      ),
    );
    await auditHumanCrmOutboundAssignment(input.context, {
      outboundIntentId: input.outboundIntentId,
      result: auditAssignmentResult(state.assignment),
      senderOrigin: input.senderOrigin,
      senderType: input.senderType,
      cycleId: input.conversationCycle.id,
    });
    return state;
  } catch (error) {
    await auditHumanCrmOutboundAssignment(
      input.context,
      {
        errorName: error instanceof Error ? error.name : "UnknownError",
        outboundIntentId: input.outboundIntentId,
        result: "failed",
        senderOrigin: input.senderOrigin,
        senderType: input.senderType,
        cycleId: input.conversationCycle.id,
      },
      "failed",
    );
    throw error;
  }
}

function shouldApplyHumanOutboundAssignment(input: {
  requiredForAccess?: boolean;
  senderOrigin: CrmMessageSenderOrigin;
  senderType: CrmMessageSenderType;
}) {
  return input.requiredForAccess || shouldAutoAssignHumanCrmOutbound(input);
}

function assertRequiredHumanOutboundAssignment(
  input: {
    context: ServiceContext;
    requiredForAccess?: boolean;
    conversationCycle: CrmConversationCycle;
  },
  conversationCycle: CrmConversationCycle,
) {
  if (
    input.requiredForAccess &&
    conversationCycle.assignedUserId !== input.context.actor.id
  ) {
    throw new ConversationCycleNotFoundError(input.conversationCycle.id);
  }
}

export async function applyHumanOutboundAssignment(input: {
  context: ServiceContext;
  outboundIntentId: string;
  ports: CrmServicePorts;
  providerTimestamp: Date;
  scope: { storeId: string; tenantId: string };
  senderOrigin: CrmMessageSenderOrigin;
  senderType: CrmMessageSenderType;
  conversationCycle: CrmConversationCycle;
}) {
  const assignment = await applyConversationCycleAssignment({
    actorId: input.context.actor.id,
    actorKind: interventionActorKind(
      input.context.actor.kind,
      "human_outbound_message",
    ),
    allowReassignment: false,
    assignedAt: input.providerTimestamp,
    assignedUserId: input.context.actor.id,
    initialSession: input.conversationCycle,
    ports: input.ports,
    scope: input.scope,
  });
  return {
    assignment,
    conversationCycle: assignment.conversationCycle,
  };
}

export async function auditHumanCrmOutboundAssignment(
  context: ServiceContext,
  input: {
    assignment?: ConversationCycleAssignmentResult | null;
    errorName?: string;
    outboundIntentId: string;
    result?:
      "applied" | "attempted" | "already_present" | "failed" | "superseded";
    senderOrigin: CrmMessageSenderOrigin;
    senderType: CrmMessageSenderType;
    cycleId: string;
  },
  outcome: "attempted" | "failed" | "succeeded" = "succeeded",
) {
  if (input.result === undefined && !input.assignment) return;
  const result =
    input.result ?? auditAssignmentResult(input.assignment ?? null);
  await auditCrmServiceEvent(
    context,
    {
      action: "crm.conversation_cycle.auto_assign",
      category: "data_change",
      entityId: input.cycleId,
      entityType: "crm_conversation_cycle",
      metadata: {
        assignedUserId: context.actor.id,
        ...(input.errorName ? { errorName: input.errorName } : {}),
        outboundIntentId: input.outboundIntentId,
        result,
        senderOrigin: input.senderOrigin,
        senderType: input.senderType,
      },
      permission: "crm.messages.send",
      summary: "Evaluated automatic CRM WhatsApp self-assignment",
    },
    outcome,
  );
}

function auditAssignmentResult(
  assignment: ConversationCycleAssignmentResult | null,
) {
  if (!assignment) return "superseded" as const;
  if (assignment.result === "already_applied")
    return "already_present" as const;
  return assignment.result;
}
