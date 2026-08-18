import type { UserId } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmWhatsappQueueVisibility } from "../ports/crmWhatsappRepository.js";
import type { CrmRealtimeEvent } from "../ports/crmRealtimePublisher.js";

const assignPermission = "crm.whatsapp.assign";

export function resolveWhatsappQueueVisibility(
  context: ServiceContext,
): CrmWhatsappQueueVisibility {
  if (context.permissions.includes(assignPermission)) return { kind: "global" };
  if (context.actor.kind === "user") {
    return { kind: "assigned", userId: context.actor.id as UserId };
  }
  return { kind: "none" };
}

export function matchesWhatsappQueueVisibility(
  visibility: CrmWhatsappQueueVisibility,
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

export function matchesWhatsappRealtimeQueueVisibility(
  visibility: CrmWhatsappQueueVisibility,
  event: CrmRealtimeEvent,
  boundary?: { assignedUserId: string | null },
) {
  switch (event.type) {
    case "message":
      return matchesWhatsappQueueVisibility(
        visibility,
        boundary ? boundary.assignedUserId : event.session.assignedUserId,
      );
    case "session":
      return (
        matchesWhatsappQueueVisibility(
          visibility,
          boundary ? boundary.assignedUserId : event.session.assignedUserId,
        ) ||
        (visibility.kind === "assigned" &&
          event.revokedUserId === visibility.userId)
      );
    case "message_status":
      return matchesWhatsappQueueVisibility(
        visibility,
        boundary ? boundary.assignedUserId : event.assignedUserId,
      );
    case "connection_status":
    case "presence":
      return true;
  }
}

export type WhatsappRealtimeAssignmentBoundary = {
  assignedUserId: string | null;
  revision: number | null;
};

export function readWhatsappRealtimeSessionBoundary(
  event: CrmRealtimeEvent,
): { boundary: WhatsappRealtimeAssignmentBoundary; sessionKey: string } | null {
  if (event.type === "message" || event.type === "session") {
    return {
      boundary: {
        assignedUserId: event.session.assignedUserId,
        revision: readRevision(event.session.revision),
      },
      sessionKey: assignmentBoundaryKey(event, String(event.session.id)),
    };
  }
  if (event.type === "message_status") {
    return {
      boundary: { assignedUserId: event.assignedUserId, revision: null },
      sessionKey: assignmentBoundaryKey(event, event.sessionId),
    };
  }
  return null;
}

export function updateWhatsappRealtimeAssignmentBoundary(
  boundaries: Map<string, WhatsappRealtimeAssignmentBoundary>,
  event: CrmRealtimeEvent,
) {
  const observed = readWhatsappRealtimeSessionBoundary(event);
  if (!observed) return;
  const current = boundaries.get(observed.sessionKey);
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
  boundaries.set(observed.sessionKey, observed.boundary);
}

function assignmentBoundaryKey(event: CrmRealtimeEvent, sessionId: string) {
  return `${event.tenantId}:${event.storeId}:${sessionId}`;
}

function readRevision(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}
