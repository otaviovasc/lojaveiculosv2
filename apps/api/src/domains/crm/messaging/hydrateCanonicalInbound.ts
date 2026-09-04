import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { IngestCrmMessageResult } from "../ports/crmConversationRepository.js";
import type { CanonicalInboundMessageResult } from "../ports/crmCanonicalInboundRepository.js";
import {
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export async function hydrateCanonicalInbound(
  ports: CrmServicePorts,
  input: {
    canonical: CanonicalInboundMessageResult;
    connection: CrmConnection;
    message: { externalId: string };
  },
): Promise<IngestCrmMessageResult> {
  if (input.canonical.createdConversationCycle === undefined) {
    throw new Error(
      "Canonical CRM inbound conversation-cycle creation state is missing.",
    );
  }
  const repository = getCrmConversationRepository(ports);
  const scope = {
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
  };
  const [message, conversationCycles] = await Promise.all([
    repository.findMessageByExternalId({
      connectionId: input.connection.id,
      externalId: input.message.externalId,
      ...scope,
    }),
    repository.listConversationCycles({
      limit: 2,
      offset: 0,
      cycleId: input.canonical.cycleId,
      ...scope,
    }),
  ]);
  const conversationCycle = conversationCycles[0];
  if (
    !message ||
    message.id !== input.canonical.messageId ||
    !conversationCycle ||
    conversationCycles.length !== 1 ||
    conversationCycle.id !== input.canonical.cycleId
  ) {
    throw new Error("Canonical CRM inbound result could not be hydrated.");
  }
  return {
    createdMessage: input.canonical.created,
    createdConversationCycle: input.canonical.createdConversationCycle,
    message,
    conversationCycle,
  };
}
