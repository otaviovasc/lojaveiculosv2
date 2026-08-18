import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmMessagingChannel,
  CrmMessageSenderOrigin,
  CrmMessageSenderType,
  CrmMessageType,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";
import {
  getCrmRepository,
  getCrmConversationRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import {
  applyHumanOutboundAssignment,
  auditHumanCrmOutboundAssignment,
  shouldAutoAssignHumanCrmOutbound,
} from "./autoAssignHumanCrmOutbound.js";
import type { ConversationCycleAssignmentResult } from "./conversationCycleAssignment.js";
import type { StartConversationTarget } from "./startConversationTarget.js";
import {
  createLocalCrmMessageExternalId,
  findOrCreateLead,
} from "./startConversationSupport.js";
import { ConversationCycleNotFoundError } from "./crmMessagingErrors.js";
import { fingerprintOutboundIntent } from "./outboundMessageSupport.js";

export async function prepareStartedConversation(input: {
  channel: CrmMessagingChannel;
  connection: CrmConnection;
  content: string;
  context: ServiceContext;
  idempotencyKey?: string;
  messageType: CrmMessageType;
  ports: CrmServicePorts;
  scope: { storeId: string; tenantId: string };
  senderOrigin: CrmMessageSenderOrigin;
  senderType: CrmMessageSenderType;
  target: StartConversationTarget;
}) {
  const assignmentRequired = requiresStartConversationAssignment(input);
  const assignmentEnabled =
    input.context.actor.kind === "user" &&
    shouldAutoAssignHumanCrmOutbound(input);
  const pendingExternalId = input.idempotencyKey
    ? `crm-local-${fingerprintOutboundIntent(input.idempotencyKey).slice(0, 40)}`
    : createLocalCrmMessageExternalId();
  const pendingAt = new Date();
  let assignmentAuditSessionId: string | null = null;
  let assignmentAuditAttempted = false;
  try {
    const pending = await runCrmTransaction(
      input.ports,
      async (transactionPorts) => {
        const repository = getCrmConversationRepository(transactionPorts);
        const existing = await repository.findConversationCycleByIdentity({
          customerPhone: input.target.phone,
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
          ...(input.target.customerDisplayName
            ? { customerDisplayName: input.target.customerDisplayName }
            : {}),
          connectionId: input.connection.id,
          externalId: pendingExternalId,
          phone: input.target.phone,
        }).then((createdLead) => input.target.lead ?? createdLead);
        const ingested = await repository.ingestMessage({
          ...(input.target.customerDisplayName
            ? { customerDisplayName: input.target.customerDisplayName }
            : {}),
          customerPhone: input.target.phone,
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
          (await assignHumanOutbound(
            ingested.conversationCycle,
            transactionPorts,
          ));
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
        cycleId: pending.ingested.conversationCycle.id,
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
          cycleId: assignmentAuditSessionId,
        },
        "failed",
      );
    }
    throw error;
  }

  async function assignHumanOutbound(
    conversationCycle: CrmConversationCycle,
    transactionPorts: CrmServicePorts,
  ): Promise<{
    assignment: ConversationCycleAssignmentResult | null;
    conversationCycle: CrmConversationCycle;
  }> {
    if (!assignmentEnabled) return { assignment: null, conversationCycle };
    assignmentAuditSessionId = conversationCycle.id;
    await auditHumanCrmOutboundAssignment(
      input.context,
      {
        outboundIntentId: pendingExternalId,
        result: "attempted",
        senderOrigin: input.senderOrigin,
        senderType: input.senderType,
        cycleId: conversationCycle.id,
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
      conversationCycle,
    });
    if (
      assignmentRequired &&
      state.conversationCycle.assignedUserId !== input.context.actor.id
    ) {
      throw new ConversationCycleNotFoundError(conversationCycle.id);
    }
    return state;
  }
}

function assertExistingSessionAccess(
  input: Parameters<typeof prepareStartedConversation>[0],
  existing: CrmConversationCycle | null,
) {
  if (
    requiresStartConversationAssignment(input) &&
    existing &&
    existing.assignedUserId !== null &&
    existing.assignedUserId !== input.context.actor.id
  ) {
    throw new ConversationCycleNotFoundError(existing.id);
  }
}

function requiresStartConversationAssignment(input: {
  context: ServiceContext;
  senderOrigin: CrmMessageSenderOrigin;
  senderType: CrmMessageSenderType;
}) {
  return (
    input.context.actor.kind === "user" &&
    !input.context.permissions.includes("crm.conversations.assign") &&
    shouldAutoAssignHumanCrmOutbound(input)
  );
}
