import { assertAnyPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { CrmExternalBotConnectionAssignmentError } from "../../errors/crmExternalBotProfileErrors.js";
import {
  botProfileManagePermissions,
  getCrmExternalBotProfileRepository,
  requireCrmExternalBotProfileScope,
} from "./serviceSupport.js";

export type AssignExternalBotProfileToConnectionInput = {
  connectionId: string;
  profileId: string | null;
};

export async function assignExternalBotProfileToConnection(
  context: ServiceContext,
  input: AssignExternalBotProfileToConnectionInput,
  ports: CrmServicePorts,
): Promise<void> {
  const permission = assertAnyPermission(context, botProfileManagePermissions);
  const scope = requireCrmExternalBotProfileScope(context);
  logCrmServiceEvent(context, "crm.external_bot.profile.assign.start", {
    connectionId: input.connectionId,
    profileId: input.profileId,
  });
  await recordCrmServiceMutation(
    context,
    {
      action: "crm.external_bot.profile.assign",
      category: "data_change",
      entityId: input.connectionId,
      entityType: "crm_channel_connection",
      metadata: {
        permission,
        profileId: input.profileId,
      },
      permission,
      summary: "Assigned CRM external bot profile to connection",
    },
    async () => {
      const result = await getCrmExternalBotProfileRepository(
        ports,
      ).assignProfileToConnection({
        connectionId: input.connectionId,
        profileId: input.profileId,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (result.kind === "connection_not_found") {
        throw new CrmExternalBotConnectionAssignmentError(
          "Connection was not found in this store.",
          "connection_not_found",
        );
      }
      if (result.kind === "profile_not_found") {
        throw new CrmExternalBotConnectionAssignmentError(
          "Profile was not found in this store.",
          "profile_not_found",
        );
      }
    },
  );
}
