import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  getCrmRepository,
  requireCrmScope,
} from "../services/CrmService/serviceSupport.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";

const terminalLeadStatuses = new Set(["archived", "lost", "won"]);

export async function closeLinkedCrmLead(
  context: ServiceContext,
  leadId: string,
  ports: CrmServicePorts,
) {
  const scope = requireCrmScope(context);
  const repository = getCrmRepository(ports);
  const lead = await repository.findLeadById({
    leadId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!lead) return;

  if (!terminalLeadStatuses.has(lead.status)) {
    await repository.updateLead({
      leadId,
      status: "contacted",
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
  }

  await repository.createActivity({
    activityType: "status_change",
    content: "Atendimento CRM concluido.",
    createdByUserId:
      context.actor.kind === "user" ? (context.actor.id as never) : null,
    direction: "internal",
    leadId,
    metadata: {
      crmMessaging: {
        closedByActorId: context.actor.id,
      },
    },
    occurredAt: new Date(),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
}
