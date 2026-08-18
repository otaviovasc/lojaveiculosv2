import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnectionProvider } from "../ports/crmConnectionRepository.js";
import type { CrmLead } from "../ports/crmRepository.js";
import type { CrmWhatsappMessageSenderType } from "../ports/crmWhatsappRepository.js";
import type { WhatsappSessionAssignmentResult } from "./whatsappSessionAssignment.js";
import {
  getCrmRepository,
  getCrmWhatsappRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { interventionActorKind } from "./humanAttendanceTransition.js";
import { transitionConfirmedHumanOutboundAttendance } from "./sendWhatsappOutboundAttendance.js";
import {
  findConversationSession,
  recordLeadInteraction,
  sentMessageMetadata,
  updateStartedConversationMessage,
} from "./startWhatsappConversationSupport.js";

export async function completeStartedWhatsappConversation(
  context: ServiceContext,
  input: {
    assignment: WhatsappSessionAssignmentResult | null;
    content: string;
    createdMessage: boolean;
    interventionId: string;
    lead: CrmLead;
    messageId: string;
    pendingExternalId: string;
    provider: CrmConnectionProvider;
    providerExternalId: string;
    providerTimestamp: Date;
    senderType: CrmWhatsappMessageSenderType;
    sessionId: string;
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
          sessionId: input.sessionId,
        })
      : input.lead;
    const persistedSession = await findConversationSession(
      context,
      transactionPorts,
      input.sessionId,
    );
    const attendance = await transitionConfirmedHumanOutboundAttendance({
      actorId: context.actor.id,
      actorKind: interventionActorKind(context.actor.kind, "admin"),
      interventionId: input.interventionId,
      providerTimestamp: input.providerTimestamp,
      repository: getCrmWhatsappRepository(transactionPorts),
      senderOrigin: message.senderOrigin,
      senderType: input.senderType,
      session: persistedSession,
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
      session: attendance.session,
    };
  });
  return completed;
}
