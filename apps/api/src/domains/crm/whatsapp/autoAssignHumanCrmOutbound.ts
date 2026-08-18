import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  CrmWhatsappMessageSenderOrigin,
  CrmWhatsappMessageSenderType,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";
import type { WhatsappSessionAssignmentResult } from "./whatsappSessionAssignment.js";
import {
  runCrmTransaction,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { applyWhatsappSessionAssignment } from "./whatsappSessionAssignment.js";
import { auditWhatsappServiceEvent } from "../services/CrmWhatsapp/serviceSupport.js";
import { WhatsappSessionNotFoundError } from "./whatsappSendErrors.js";

export function shouldAutoAssignHumanCrmOutbound(input: {
  senderOrigin: CrmWhatsappMessageSenderOrigin;
  senderType: CrmWhatsappMessageSenderType;
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
  senderOrigin: CrmWhatsappMessageSenderOrigin;
  senderType: CrmWhatsappMessageSenderType;
  session: CrmWhatsappSession;
}) {
  if (!shouldApplyHumanOutboundAssignment(input)) {
    return { assignment: null, session: input.session };
  }
  await auditHumanCrmOutboundAssignment(
    input.context,
    {
      outboundIntentId: input.outboundIntentId,
      result: "attempted",
      senderOrigin: input.senderOrigin,
      senderType: input.senderType,
      sessionId: input.session.id,
    },
    "attempted",
  );
  try {
    const state = await runCrmTransaction(input.ports, (transactionPorts) =>
      applyHumanOutboundAssignment({ ...input, ports: transactionPorts }).then(
        (assignment) => {
          assertRequiredHumanOutboundAssignment(input, assignment.session);
          return assignment;
        },
      ),
    );
    await auditHumanCrmOutboundAssignment(input.context, {
      outboundIntentId: input.outboundIntentId,
      result: auditAssignmentResult(state.assignment),
      senderOrigin: input.senderOrigin,
      senderType: input.senderType,
      sessionId: input.session.id,
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
        sessionId: input.session.id,
      },
      "failed",
    );
    throw error;
  }
}

function shouldApplyHumanOutboundAssignment(input: {
  requiredForAccess?: boolean;
  senderOrigin: CrmWhatsappMessageSenderOrigin;
  senderType: CrmWhatsappMessageSenderType;
}) {
  return input.requiredForAccess || shouldAutoAssignHumanCrmOutbound(input);
}

function assertRequiredHumanOutboundAssignment(
  input: {
    context: ServiceContext;
    requiredForAccess?: boolean;
    session: CrmWhatsappSession;
  },
  session: CrmWhatsappSession,
) {
  if (
    input.requiredForAccess &&
    session.assignedUserId !== input.context.actor.id
  ) {
    throw new WhatsappSessionNotFoundError(input.session.id);
  }
}

export async function applyHumanOutboundAssignment(input: {
  context: ServiceContext;
  outboundIntentId: string;
  ports: CrmServicePorts;
  providerTimestamp: Date;
  scope: { storeId: string; tenantId: string };
  senderOrigin: CrmWhatsappMessageSenderOrigin;
  senderType: CrmWhatsappMessageSenderType;
  session: CrmWhatsappSession;
}) {
  const assignment = await applyWhatsappSessionAssignment({
    allowReassignment: false,
    assignedAt: input.providerTimestamp,
    assignedUserId: input.context.actor.id,
    initialSession: input.session,
    ports: input.ports,
    scope: input.scope,
  });
  return {
    assignment,
    session: assignment.session,
  };
}

export async function auditHumanCrmOutboundAssignment(
  context: ServiceContext,
  input: {
    assignment?: WhatsappSessionAssignmentResult | null;
    errorName?: string;
    outboundIntentId: string;
    result?:
      "applied" | "attempted" | "already_present" | "failed" | "superseded";
    senderOrigin: CrmWhatsappMessageSenderOrigin;
    senderType: CrmWhatsappMessageSenderType;
    sessionId: string;
  },
  outcome: "attempted" | "failed" | "succeeded" = "succeeded",
) {
  if (input.result === undefined && !input.assignment) return;
  const result =
    input.result ?? auditAssignmentResult(input.assignment ?? null);
  await auditWhatsappServiceEvent(
    context,
    {
      action: "crm.whatsapp.session.auto_assign",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: {
        assignedUserId: context.actor.id,
        ...(input.errorName ? { errorName: input.errorName } : {}),
        outboundIntentId: input.outboundIntentId,
        result,
        senderOrigin: input.senderOrigin,
        senderType: input.senderType,
      },
      permission: "crm.whatsapp.send",
      summary: "Evaluated automatic CRM WhatsApp self-assignment",
    },
    outcome,
  );
}

function auditAssignmentResult(
  assignment: WhatsappSessionAssignmentResult | null,
) {
  if (!assignment) return "superseded" as const;
  if (assignment.result === "already_applied")
    return "already_present" as const;
  return assignment.result;
}
