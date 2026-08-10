import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnectionProvider } from "../ports/crmConnectionRepository.js";
import type { CrmLead } from "../ports/crmRepository.js";
import type { CrmWhatsappMessageSenderType } from "../ports/crmWhatsappRepository.js";
import {
  getCrmWhatsappRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
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
  return runCrmTransaction(ports, async (transactionPorts) => {
    const repository = getCrmWhatsappRepository(transactionPorts);
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
      interventionId: input.interventionId,
      providerTimestamp: input.providerTimestamp,
      repository,
      senderType: input.senderType,
      session: persistedSession,
    });
    return {
      attendanceChanged: attendance.changed,
      lead,
      message,
      session: attendance.session,
    };
  });
}
