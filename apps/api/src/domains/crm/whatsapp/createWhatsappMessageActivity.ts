import type { CrmLead } from "../ports/crmRepository.js";
import type { CrmConnectionProvider } from "../ports/crmConnectionRepository.js";
import {
  getCrmRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export async function createWhatsappMessageActivity(
  ports: CrmServicePorts,
  input: {
    connectionId: string;
    content: string;
    direction: "inbound" | "outbound";
    leadId: string;
    messageExternalId: string;
    occurredAt: Date;
    provider: CrmConnectionProvider;
    sessionId: string;
    storeId: CrmLead["storeId"];
    tenantId: CrmLead["tenantId"];
  },
) {
  await getCrmRepository(ports).createActivity({
    activityType: "whatsapp",
    content: input.content,
    createdByUserId: null,
    direction: input.direction,
    leadId: input.leadId,
    metadata: {
      crmWhatsapp: {
        connectionId: input.connectionId,
        messageExternalId: input.messageExternalId,
        sessionId: input.sessionId,
      },
      provider: input.provider,
    },
    occurredAt: input.occurredAt,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
}
