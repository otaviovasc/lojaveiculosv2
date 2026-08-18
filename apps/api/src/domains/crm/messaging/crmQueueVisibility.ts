import type { UserId } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmQueueVisibility } from "../ports/crmConversationRepository.js";
import type { CrmRealtimeEvent } from "../ports/crmRealtimePublisher.js";

const assignPermission = "crm.conversations.assign";

export function resolveCrmQueueVisibility(
  context: ServiceContext,
): CrmQueueVisibility {
  if (context.permissions.includes(assignPermission)) return { kind: "global" };
  if (context.actor.kind === "user") {
    return { kind: "assigned", userId: context.actor.id as UserId };
  }
  return { kind: "none" };
}

export function matchesCrmQueueVisibility(
  visibility: CrmQueueVisibility,
  assignedUserId: string | null,
) {
  switch (visibility.kind) {
    case "global":
      return true;
    case "assigned":
      return assignedUserId === visibility.userId;
    case "none":
      return false;
  }
}

export function matchesCrmRealtimeQueueVisibility(
  visibility: CrmQueueVisibility,
  event: CrmRealtimeEvent,
  boundary?: { assignedUserId: string | null },
) {
  switch (event.type) {
    case "message":
      return matchesCrmQueueVisibility(
        visibility,
        boundary
          ? boundary.assignedUserId
          : event.conversationCycle.assignedUserId,
      );
    case "conversationCycle":
      return (
        matchesCrmQueueVisibility(
          visibility,
          boundary
            ? boundary.assignedUserId
            : event.conversationCycle.assignedUserId,
        ) ||
        (visibility.kind === "assigned" &&
          event.revokedUserId === visibility.userId)
      );
    case "message_status":
      return matchesCrmQueueVisibility(
        visibility,
        boundary ? boundary.assignedUserId : event.assignedUserId,
      );
    case "connection_status":
    case "presence":
      return true;
  }
}

export type CrmRealtimeAssignmentBoundary = {
  assignedUserId: string | null;
  revision: number | null;
};

export function readCrmRealtimeConversationCycleBoundary(
  event: CrmRealtimeEvent,
): { boundary: CrmRealtimeAssignmentBoundary; cycleKey: string } | null {
  if (event.type === "message" || event.type === "conversationCycle") {
    return {
      boundary: {
        assignedUserId: event.conversationCycle.assignedUserId,
        revision: readRevision(event.conversationCycle.revision),
      },
      cycleKey: assignmentBoundaryKey(
        event,
        String(event.conversationCycle.id),
      ),
    };
  }
  if (event.type === "message_status") {
    return {
      boundary: { assignedUserId: event.assignedUserId, revision: null },
      cycleKey: assignmentBoundaryKey(event, event.cycleId),
    };
  }
  return null;
}

export function updateCrmRealtimeAssignmentBoundary(
  boundaries: Map<string, CrmRealtimeAssignmentBoundary>,
  event: CrmRealtimeEvent,
) {
  const observed = readCrmRealtimeConversationCycleBoundary(event);
  if (!observed) return;
  const current = boundaries.get(observed.cycleKey);
  if (
    current &&
    current.revision !== null &&
    observed.boundary.revision !== null &&
    observed.boundary.revision < current.revision
  ) {
    return;
  }
  if (current?.revision !== undefined && observed.boundary.revision === null) {
    return;
  }
  boundaries.set(observed.cycleKey, observed.boundary);
}

function assignmentBoundaryKey(event: CrmRealtimeEvent, cycleId: string) {
  return `${event.tenantId}:${event.storeId}:${cycleId}`;
}

function readRevision(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}
