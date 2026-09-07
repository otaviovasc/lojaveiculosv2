import {
  assertEntitlement,
  AuthorizationError,
} from "../../../shared/authorization.js";
import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  CrmConnectionNotFoundError,
  CrmMessageActionError,
} from "./crmMessagingErrors.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import {
  getCrmConnectionRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export const specialDateConfigPermission =
  "crm.messaging.connection.setup" as const;
export const specialDateProcessPermission =
  "crm.scheduled_messages.process" as const;

export type SpecialDateScope = {
  storeId: StoreId;
  tenantId: TenantId;
};

export function requireSpecialDateScope(
  context: ServiceContext,
): SpecialDateScope {
  const scope = requireCrmScope(context);
  return {
    storeId: scope.storeId as StoreId,
    tenantId: scope.tenantId as TenantId,
  };
}

export async function requireSpecialDateConnection(
  context: ServiceContext,
  connectionId: string,
  ports: CrmServicePorts,
  options: { requireReady?: boolean } = {},
): Promise<{
  connection: CrmConnection;
  scope: SpecialDateScope;
}> {
  assertEntitlement(context, "crm");
  const scope = requireSpecialDateScope(context);
  const connection =
    await getCrmConnectionRepository(ports).findConnectionById(connectionId);

  if (
    !connection ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId ||
    connection.status === "archived" ||
    connection.channel !== "whatsapp"
  ) {
    throw new CrmConnectionNotFoundError(connectionId);
  }

  // Managers with queue-wide access can manage every connection in the store.
  // Other users need an explicit connection membership. Integrations are
  // already scoped by their service context and do not have user membership.
  if (
    context.actor.kind === "user" &&
    !context.permissions.includes("crm.conversations.assign") &&
    !context.permissions.includes("crm.conversations.read_unassigned")
  ) {
    const memberRepository = ports.crmConnectionMemberRepository;
    if (!memberRepository) {
      throw new AuthorizationError("CRM connection access is unavailable.");
    }
    const connectionIds = await memberRepository.listConnectionIdsForUser({
      storeId: scope.storeId,
      tenantId: scope.tenantId,
      userId: context.actor.id as UserId,
    });
    if (!connectionIds.includes(connectionId)) {
      throw new CrmConnectionNotFoundError(connectionId);
    }
  }

  if (options.requireReady !== false && connection.status !== "active") {
    throw new CrmMessageActionError(
      "CRM WhatsApp connection is not ready for automation.",
      422,
    );
  }
  return { connection, scope };
}
