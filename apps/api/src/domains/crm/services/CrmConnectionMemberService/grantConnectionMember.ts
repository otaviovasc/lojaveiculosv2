import type { UserId } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { CrmScopeError } from "../../crmScopeError.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import { CrmConnectionMemberValidationError } from "./crmConnectionMemberErrors.js";
import {
  connectionMemberPermission,
  getCrmConnectionMemberRepository,
  requireWhatsappConnection,
  type CrmConnectionMemberServicePorts,
} from "./connectionMemberSupport.js";

export type GrantConnectionMemberInput = {
  connectionId: string;
  userId: string;
};

export async function grantConnectionMember(
  context: ServiceContext,
  input: GrantConnectionMemberInput,
  ports: CrmConnectionMemberServicePorts,
): Promise<void> {
  assertPermission(context, connectionMemberPermission);
  const { connection, scope } = await requireWhatsappConnection(
    context,
    input.connectionId,
    ports,
  );
  logCrmServiceEvent(context, "crm.connection.member.grant.started", {
    connectionId: connection.id,
    memberUserId: input.userId,
  });
  await recordCrmServiceMutation(
    context,
    {
      action: "crm.connection.member.grant",
      category: "data_change",
      entityId: connection.id,
      entityType: "crm_channel_connection",
      metadata: { memberUserId: input.userId },
      permission: connectionMemberPermission,
      storeId: scope.storeId,
      summary: "Granted CRM connection member access",
      tenantId: scope.tenantId,
    },
    async () => {
      if (!ports.crmAssigneeMembershipRepository) {
        throw new CrmScopeError("crmAssigneeMembershipRepository");
      }
      const eligible =
        await ports.crmAssigneeMembershipRepository.isActiveStoreMember({
          storeId: scope.storeId as never,
          tenantId: scope.tenantId as never,
          userId: input.userId as UserId,
        });
      if (!eligible) {
        throw new CrmConnectionMemberValidationError(
          "Connection member must be an active member of this store.",
          "user_not_store_member",
        );
      }
      await getCrmConnectionMemberRepository(ports).grantMember({
        connectionId: connection.id,
        grantedBy: context.actor.kind === "user" ? context.actor.id : null,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
        userId: input.userId as UserId,
      });
    },
  );
}
