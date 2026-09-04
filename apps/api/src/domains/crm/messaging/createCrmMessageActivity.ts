import type { CrmLead } from "../ports/crmRepository.js";
import type { CrmConnectionProvider } from "../ports/crmConnectionRepository.js";
import {
  getCrmRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export async function createCrmMessageActivity(
  ports: CrmServicePorts,
  input: {
    connectionId: string;
    content: string;
    direction: "inbound" | "outbound";
    leadId: string;
    messageExternalId: string;
    occurredAt: Date;
    provider: CrmConnectionProvider;
    cycleId: string;
    storeId: CrmLead["storeId"];
    tenantId: CrmLead["tenantId"];
  },
) {
  await getCrmRepository(ports).createActivity({
    activityType: "message",
    content: input.content,
    createdByUserId: null,
    direction: input.direction,
    leadId: input.leadId,
    metadata: {
      crmMessaging: {
        connectionId: input.connectionId,
        messageExternalId: input.messageExternalId,
        cycleId: input.cycleId,
      },
      provider: input.provider,
    },
    occurredAt: input.occurredAt,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
}
