import type { UserId } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmQueueVisibility } from "../ports/crmConversationRepository.js";
import type { CrmConnectionMemberRepository } from "../ports/crmConnectionMemberRepository.js";

const assignPermission = "crm.conversations.assign";
const readUnassignedPermission = "crm.conversations.read_unassigned";

export type CrmConnectionScopedQueueVisibilityPorts = {
  crmConnectionMemberRepository?: CrmConnectionMemberRepository;
};

export function resolveCrmQueueVisibility(
  context: ServiceContext,
): CrmQueueVisibility {
  if (
    context.permissions.includes(assignPermission) ||
    context.permissions.includes(readUnassignedPermission)
  ) {
    return { connectionIds: null, kind: "global" };
  }
  if (context.actor.kind === "user") {
    return {
      connectionIds: null,
      kind: "assigned",
      userId: context.actor.id as UserId,
    };
  }
  return { connectionIds: null, kind: "none" };
}

/**
 * Extends {@link resolveCrmQueueVisibility} with per-connection member access.
 * Membership is resolved here (the caller's boundary) so the base resolver
 * stays synchronous-pure. `connectionIds: null` means unrestricted; an empty
 * list means the actor sees no connection-scoped queue rows.
 */
export async function resolveCrmConnectionScopedQueueVisibility(
  context: ServiceContext,
  ports: CrmConnectionScopedQueueVisibilityPorts,
): Promise<CrmQueueVisibility> {
  const visibility = resolveCrmQueueVisibility(context);
  if (visibility.kind !== "assigned") return visibility;
  if (!context.tenantId || !context.storeId) {
    return { ...visibility, connectionIds: [] };
  }
  if (!ports.crmConnectionMemberRepository) {
    // Fail-soft until the port is wired into the runtime ports: keep the
    // legacy connection-unrestricted assigned visibility.
    context.logger.warn("crm.queue_visibility.connection_scope_unavailable", {
      actorId: context.actor.id,
      requestId: context.requestId,
      storeId: context.storeId,
      tenantId: context.tenantId,
    });
    return visibility;
  }
  const connectionIds =
    await ports.crmConnectionMemberRepository.listConnectionIdsForUser({
      storeId: context.storeId as never,
      tenantId: context.tenantId as never,
      userId: visibility.userId,
    });
  return { ...visibility, connectionIds };
}

export function matchesConnectionScope(
  visibility: CrmQueueVisibility,
  connectionId: string | null | undefined,
) {
  if (visibility.connectionIds == null) return true;
  if (connectionId == null) return false;
  return visibility.connectionIds.includes(connectionId);
}

export function matchesCrmQueueVisibility(
  visibility: CrmQueueVisibility,
  assignedUserId: string | null,
  connectionId?: string | null,
) {
  if (!matchesConnectionScope(visibility, connectionId)) return false;
  switch (visibility.kind) {
    case "global":
      return true;
    case "assigned":
      return assignedUserId === visibility.userId;
    case "none":
      return false;
  }
}
