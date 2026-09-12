import { assertAnyPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmExternalBotProfileConnectionAssignment } from "../../ports/crmExternalBotProfileRepository.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  botProfileReadPermissions,
  getCrmExternalBotProfileRepository,
  requireCrmExternalBotProfileScope,
} from "./serviceSupport.js";

export async function listExternalBotProfileAssignments(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<readonly CrmExternalBotProfileConnectionAssignment[]> {
  const permission = assertAnyPermission(context, botProfileReadPermissions);
  const scope = requireCrmExternalBotProfileScope(context);
  logCrmServiceEvent(
    context,
    "crm.external_bot.profile.assignments.list.start",
  );
  const assignments = await getCrmExternalBotProfileRepository(
    ports,
  ).listConnectionProfileAssignments({
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  await auditCrmServiceEvent(context, {
    action: "crm.external_bot.profile.assignments.list",
    category: "data_access",
    metadata: { count: assignments.length, permission },
    permission,
    summary: "Listed CRM external bot profile assignments",
  });
  return assignments;
}
