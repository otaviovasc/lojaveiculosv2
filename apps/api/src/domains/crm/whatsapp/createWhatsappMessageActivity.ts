import type { CrmLead } from "../ports/crmRepository.js";
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
      provider: "zapi",
    },
    occurredAt: input.occurredAt,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
}
