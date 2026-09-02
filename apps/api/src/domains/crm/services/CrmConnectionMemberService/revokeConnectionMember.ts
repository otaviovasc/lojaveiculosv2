import type { UserId } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import {
  connectionMemberPermission,
  getCrmConnectionMemberRepository,
  requireWhatsappConnection,
  type CrmConnectionMemberServicePorts,
} from "./connectionMemberSupport.js";
import { CrmConnectionMemberValidationError } from "./crmConnectionMemberErrors.js";

export type RevokeConnectionMemberInput = {
  connectionId: string;
  userId: string;
};

export type RevokeConnectionMemberResult = {
  activeAssignedConversationCount: number;
  revoked: boolean;
};

export async function revokeConnectionMember(
  context: ServiceContext,
  input: RevokeConnectionMemberInput,
  ports: CrmConnectionMemberServicePorts,
): Promise<RevokeConnectionMemberResult> {
  assertPermission(context, connectionMemberPermission);
  const { connection, scope } = await requireWhatsappConnection(
    context,
    input.connectionId,
    ports,
  );
  logCrmServiceEvent(context, "crm.connection.member.revoke.started", {
    connectionId: connection.id,
    memberUserId: input.userId,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.connection.member.revoke",
      category: "data_change",
      entityId: connection.id,
      entityType: "crm_channel_connection",
      metadata: { memberUserId: input.userId },
      permission: connectionMemberPermission,
      storeId: scope.storeId,
      summary: "Revoked CRM connection member access",
      tenantId: scope.tenantId,
    },
    async () => {
      // Fail-closed visibility: revoking the final member would make the
      // connection invisible to everyone, including the connection creator.
      const members = await getCrmConnectionMemberRepository(ports).listMembers(
        {
          connectionId: connection.id,
          storeId: scope.storeId as never,
          tenantId: scope.tenantId as never,
        },
      );
      const isMember = members.some((member) => member.userId === input.userId);
      if (isMember && members.length <= 1) {
        throw new CrmConnectionMemberValidationError(
          "Cannot revoke the last remaining member of a connection.",
          "connection_last_member",
        );
      }
      // Visibility-only change: conversations currently assigned to the
      // revoked user stay assigned; they just leave the user's queue scope.
      const activeAssignedConversationCount = ports.crmConversationRepository
        ? await ports.crmConversationRepository.countConversationCycles({
            assignedUserId: input.userId as UserId,
            connectionId: connection.id,
            filter: "mine",
            storeId: scope.storeId as never,
            tenantId: scope.tenantId as never,
          })
        : 0;
      const { revoked } = await getCrmConnectionMemberRepository(
        ports,
      ).revokeMember({
        connectionId: connection.id,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
        userId: input.userId as UserId,
      });
      return { activeAssignedConversationCount, revoked };
    },
    (result) => ({
      activeAssignedConversationCount: result.activeAssignedConversationCount,
      assignmentsLeftIntact: result.activeAssignedConversationCount > 0,
      revoked: result.revoked,
    }),
  );
}
