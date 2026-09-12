import { assertAnyPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmExternalBotProfile } from "../../ports/crmExternalBotProfileRepository.js";
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

export async function listExternalBotProfiles(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<readonly CrmExternalBotProfile[]> {
  const permission = assertAnyPermission(context, botProfileReadPermissions);
  const scope = requireCrmExternalBotProfileScope(context);
  logCrmServiceEvent(context, "crm.external_bot.profile.list.start");
  const profiles = await getCrmExternalBotProfileRepository(ports).listProfiles(
    {
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    },
  );
  await auditCrmServiceEvent(context, {
    action: "crm.external_bot.profile.list",
    category: "data_access",
    metadata: { count: profiles.length, permission },
    permission,
    summary: "Listed CRM external bot profiles",
  });
  return profiles;
}
