import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnectionMember } from "../../ports/crmConnectionMemberRepository.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import {
  connectionMemberPermission,
  getCrmConnectionMemberRepository,
  requireWhatsappConnection,
  type CrmConnectionMemberServicePorts,
} from "./connectionMemberSupport.js";

export type ListConnectionMembersInput = {
  connectionId: string;
};

export async function listConnectionMembers(
  context: ServiceContext,
  input: ListConnectionMembersInput,
  ports: CrmConnectionMemberServicePorts,
): Promise<readonly CrmConnectionMember[]> {
  assertPermission(context, connectionMemberPermission);
  const { connection, scope } = await requireWhatsappConnection(
    context,
    input.connectionId,
    ports,
  );
  logCrmServiceEvent(context, "crm.connection.member.list.started", {
    connectionId: connection.id,
  });
  const members = await getCrmConnectionMemberRepository(ports).listMembers({
    connectionId: connection.id,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  await auditCrmServiceEvent(context, {
    action: "crm.connection.member.list",
    category: "data_access",
    entityId: connection.id,
    entityType: "crm_channel_connection",
    metadata: { memberCount: members.length },
    permission: connectionMemberPermission,
    storeId: scope.storeId,
    summary: "Listed CRM connection members",
    tenantId: scope.tenantId,
  });
  return members;
}
