import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnectionMemberRepository } from "../../ports/crmConnectionMemberRepository.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { CrmScopeError } from "../../crmScopeError.js";
import {
  getCrmConnectionRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { CrmConnectionMemberValidationError } from "./crmConnectionMemberErrors.js";

export type CrmConnectionMemberServicePorts = Pick<
  CrmServicePorts,
  | "crmAssigneeMembershipRepository"
  | "crmConnectionRepository"
  | "crmConversationRepository"
> & {
  crmConnectionMemberRepository?: CrmConnectionMemberRepository;
};

export const connectionMemberPermission = "crm.messaging.connection.setup";

export function getCrmConnectionMemberRepository(
  ports: CrmConnectionMemberServicePorts,
): CrmConnectionMemberRepository {
  if (!ports.crmConnectionMemberRepository) {
    throw new CrmScopeError("crmConnectionMemberRepository");
  }
  return ports.crmConnectionMemberRepository;
}

export async function requireWhatsappConnection(
  context: ServiceContext,
  connectionId: string,
  ports: CrmConnectionMemberServicePorts,
): Promise<{
  connection: CrmConnection;
  scope: { storeId: string; tenantId: string };
}> {
  const scope = requireCrmMessagingScope(context);
  const connection =
    await getCrmConnectionRepository(ports).findConnectionById(connectionId);
  if (
    !connection ||
    connection.status === "archived" ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    throw new CrmConnectionMemberValidationError(
      "CRM channel connection was not found for this store.",
      "connection_not_found",
    );
  }
  if (connection.channel !== "whatsapp") {
    throw new CrmConnectionMemberValidationError(
      "Connection member access is only supported for WhatsApp connections.",
      "connection_not_whatsapp",
    );
  }
  return { connection, scope };
}
