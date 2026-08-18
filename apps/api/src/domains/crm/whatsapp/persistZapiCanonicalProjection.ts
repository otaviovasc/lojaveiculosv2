import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { IngestCrmWhatsappMessageResult } from "../ports/crmWhatsappRepository.js";
import type { CanonicalInboundMessageResult } from "../ports/crmCanonicalInboundRepository.js";
import {
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export async function projectZapiCanonicalInbound(
  ports: CrmServicePorts,
  input: {
    canonical: CanonicalInboundMessageResult;
    connection: CrmConnection;
    message: { externalId: string };
  },
): Promise<IngestCrmWhatsappMessageResult> {
  if (input.canonical.createdSession === undefined) {
    throw new Error("Canonical CRM inbound session creation state is missing.");
  }
  const repository = getCrmWhatsappRepository(ports);
  const scope = {
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
  };
  const [message, sessions] = await Promise.all([
    repository.findMessageByExternalId({
      connectionId: input.connection.id,
      externalId: input.message.externalId,
      ...scope,
    }),
    repository.listSessions({
      limit: 2,
      offset: 0,
      sessionId: input.canonical.cycleId,
      ...scope,
    }),
  ]);
  const session = sessions[0];
  if (
    !message ||
    message.id !== input.canonical.messageId ||
    !session ||
    sessions.length !== 1 ||
    session.id !== input.canonical.cycleId
  ) {
    throw new Error("Canonical CRM inbound projection could not be hydrated.");
  }
  return {
    createdMessage: input.canonical.created,
    createdSession: input.canonical.createdSession,
    message,
    session,
  };
}
