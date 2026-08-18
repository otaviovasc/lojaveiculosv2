import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnectionProvider } from "../ports/crmConnectionRepository.js";
import type { CrmLead } from "../ports/crmRepository.js";
import type { CrmMessageSenderType } from "../ports/crmConversationRepository.js";
import type { ConversationCycleAssignmentResult } from "./conversationCycleAssignment.js";
import {
  getCrmRepository,
  getCrmConversationRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { interventionActorKind } from "./humanAttendanceTransition.js";
import { transitionConfirmedHumanOutboundAttendance } from "./outboundAttendance.js";
import {
  findConversationSession,
  recordLeadInteraction,
  sentMessageMetadata,
  updateStartedConversationMessage,
} from "./startConversationSupport.js";

export async function completeStartedConversation(
  context: ServiceContext,
  input: {
    assignment: ConversationCycleAssignmentResult | null;
    content: string;
    createdMessage: boolean;
    interventionId: string;
    lead: CrmLead;
    messageId: string;
    pendingExternalId: string;
    provider: CrmConnectionProvider;
    providerExternalId: string;
    providerTimestamp: Date;
    senderType: CrmMessageSenderType;
    cycleId: string;
  },
  ports: CrmServicePorts,
) {
  const completed = await runCrmTransaction(ports, async (transactionPorts) => {
    const message = await updateStartedConversationMessage(
      context,
      transactionPorts,
      {
        externalId: input.providerExternalId,
        messageId: input.messageId,
        metadata: sentMessageMetadata({
          pendingExternalId: input.pendingExternalId,
          provider: input.provider,
          sentByActorId: context.actor.id,
        }),
        providerTimestamp: input.providerTimestamp,
        status: "SENT",
      },
    );
    const lead = input.createdMessage
      ? await recordLeadInteraction(context, transactionPorts, {
          content: input.content,
          lead: input.lead,
          messageExternalId: input.providerExternalId,
          occurredAt: input.providerTimestamp,
          provider: input.provider,
          cycleId: input.cycleId,
        })
      : input.lead;
    const persistedSession = await findConversationSession(
      context,
      transactionPorts,
      input.cycleId,
    );
    const attendance = await transitionConfirmedHumanOutboundAttendance({
      actorId: context.actor.id,
      actorKind: interventionActorKind(context.actor.kind, "admin"),
      interventionId: input.interventionId,
      providerTimestamp: input.providerTimestamp,
      repository: getCrmConversationRepository(transactionPorts),
      senderOrigin: message.senderOrigin,
      senderType: input.senderType,
      conversationCycle: persistedSession,
    });
    const currentLead = input.assignment
      ? await getCrmRepository(transactionPorts).findLeadById({
          leadId: lead.id,
          storeId: persistedSession.storeId,
          tenantId: persistedSession.tenantId,
        })
      : lead;
    return {
      attendanceChanged: attendance.changed,
      lead: currentLead ?? lead,
      message,
      conversationCycle: attendance.conversationCycle,
    };
  });
  return completed;
}
