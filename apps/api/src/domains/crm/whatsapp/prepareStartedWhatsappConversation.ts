import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmWhatsappChannel,
  CrmWhatsappMessageSenderOrigin,
  CrmWhatsappMessageSenderType,
  CrmWhatsappMessageType,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";
import {
  getCrmRepository,
  getCrmWhatsappRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import {
  applyHumanOutboundAssignment,
  auditHumanCrmOutboundAssignment,
  shouldAutoAssignHumanCrmOutbound,
} from "./autoAssignHumanCrmOutbound.js";
import type { WhatsappSessionAssignmentResult } from "./whatsappSessionAssignment.js";
import type { StartConversationTarget } from "./startWhatsappConversationTarget.js";
import {
  createLocalWhatsappExternalId,
  findOrCreateLead,
} from "./startWhatsappConversationSupport.js";
import { WhatsappSessionNotFoundError } from "./whatsappSendErrors.js";
import { fingerprintOutboundIntent } from "./sendWhatsappOutboundSupport.js";

export async function prepareStartedWhatsappConversation(input: {
  channel: CrmWhatsappChannel;
  connection: CrmConnection;
  content: string;
  context: ServiceContext;
  idempotencyKey?: string;
  messageType: CrmWhatsappMessageType;
  ports: CrmServicePorts;
  scope: { storeId: string; tenantId: string };
  senderOrigin: CrmWhatsappMessageSenderOrigin;
  senderType: CrmWhatsappMessageSenderType;
  target: StartConversationTarget;
}) {
  const assignmentRequired = requiresStartConversationAssignment(input);
  const assignmentEnabled =
    input.context.actor.kind === "user" &&
    shouldAutoAssignHumanCrmOutbound(input);
  const pendingExternalId = input.idempotencyKey
    ? `crm-local-${fingerprintOutboundIntent(input.idempotencyKey).slice(0, 40)}`
    : createLocalWhatsappExternalId();
  const pendingAt = new Date();
  let assignmentAuditSessionId: string | null = null;
  let assignmentAuditAttempted = false;
  try {
    const pending = await runCrmTransaction(
      input.ports,
      async (transactionPorts) => {
        const repository = getCrmWhatsappRepository(transactionPorts);
        const existing = await repository.findSessionByIdentity({
          buyerPhone: input.target.phone,
          channel: input.channel,
          connectionId: input.connection.id,
          storeId: input.scope.storeId as never,
          tenantId: input.scope.tenantId as never,
        });
        assertExistingSessionAccess(input, existing);
        const existingAssignment = existing
          ? await assignHumanOutbound(existing, transactionPorts)
          : null;
        const lead = await findOrCreateLead(input.context, transactionPorts, {
          ...(input.target.buyerName
            ? { buyerName: input.target.buyerName }
            : {}),
          connectionId: input.connection.id,
          externalId: pendingExternalId,
          phone: input.target.phone,
        }).then((createdLead) => input.target.lead ?? createdLead);
        const ingested = await repository.ingestMessage({
          ...(input.target.buyerName
            ? { buyerName: input.target.buyerName }
            : {}),
          buyerPhone: input.target.phone,
          channel: input.channel,
          connectionId: input.connection.id,
          content: input.content,
          direction: "OUTBOUND",
          externalId: pendingExternalId,
          leadId: lead.id,
          metadata: {
            pendingExternalId,
            provider: input.connection.provider,
            sentByActorId: input.context.actor.id,
            sendState: "PENDING_PROVIDER_SEND",
          },
          providerTimestamp: pendingAt,
          senderOrigin: input.senderOrigin,
          senderType: input.senderType,
          status: "PENDING",
          storeId: input.scope.storeId as never,
          tenantId: input.scope.tenantId as never,
          type: input.messageType,
        });
        const assignmentState =
          existingAssignment ??
          (await assignHumanOutbound(ingested.session, transactionPorts));
        const assignedLead =
          existingAssignment?.assignment?.result === "applied" &&
          lead.assignedUserId !== input.context.actor.id
            ? await getCrmRepository(transactionPorts).updateLead({
                assignedUserId: input.context.actor.id as never,
                leadId: lead.id,
                storeId: input.scope.storeId as never,
                tenantId: input.scope.tenantId as never,
              })
            : lead;
        return {
          assignment: assignmentState.assignment,
          ingested,
          lead: assignedLead,
        };
      },
    );
    if (pending.assignment) {
      await auditHumanCrmOutboundAssignment(input.context, {
        assignment: pending.assignment,
        outboundIntentId: pendingExternalId,
        senderOrigin: input.senderOrigin,
        senderType: input.senderType,
        sessionId: pending.ingested.session.id,
      });
    }
    return { ...pending, pendingExternalId };
  } catch (error) {
    if (assignmentAuditAttempted && assignmentAuditSessionId) {
      await auditHumanCrmOutboundAssignment(
        input.context,
        {
          errorName: error instanceof Error ? error.name : "UnknownError",
          outboundIntentId: pendingExternalId,
          result: "failed",
          senderOrigin: input.senderOrigin,
          senderType: input.senderType,
          sessionId: assignmentAuditSessionId,
        },
        "failed",
      );
    }
    throw error;
  }

  async function assignHumanOutbound(
    session: CrmWhatsappSession,
    transactionPorts: CrmServicePorts,
  ): Promise<{
    assignment: WhatsappSessionAssignmentResult | null;
    session: CrmWhatsappSession;
  }> {
    if (!assignmentEnabled) return { assignment: null, session };
    assignmentAuditSessionId = session.id;
    await auditHumanCrmOutboundAssignment(
      input.context,
      {
        outboundIntentId: pendingExternalId,
        result: "attempted",
        senderOrigin: input.senderOrigin,
        senderType: input.senderType,
        sessionId: session.id,
      },
      "attempted",
    );
    assignmentAuditAttempted = true;
    const state = await applyHumanOutboundAssignment({
      context: input.context,
      outboundIntentId: pendingExternalId,
      ports: transactionPorts,
      providerTimestamp: pendingAt,
      scope: input.scope,
      senderOrigin: input.senderOrigin,
      senderType: input.senderType,
      session,
    });
    if (
      assignmentRequired &&
      state.session.assignedUserId !== input.context.actor.id
    ) {
      throw new WhatsappSessionNotFoundError(session.id);
    }
    return state;
  }
}

function assertExistingSessionAccess(
  input: Parameters<typeof prepareStartedWhatsappConversation>[0],
  existing: CrmWhatsappSession | null,
) {
  if (
    requiresStartConversationAssignment(input) &&
    existing &&
    existing.assignedUserId !== null &&
    existing.assignedUserId !== input.context.actor.id
  ) {
    throw new WhatsappSessionNotFoundError(existing.id);
  }
}

function requiresStartConversationAssignment(input: {
  context: ServiceContext;
  senderOrigin: CrmWhatsappMessageSenderOrigin;
  senderType: CrmWhatsappMessageSenderType;
}) {
  return (
    input.context.actor.kind === "user" &&
    !input.context.permissions.includes("crm.whatsapp.assign") &&
    shouldAutoAssignHumanCrmOutbound(input)
  );
}
