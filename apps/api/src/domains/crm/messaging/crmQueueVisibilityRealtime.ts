import type { CrmQueueVisibility } from "../ports/crmConversationRepository.js";
import type { CrmRealtimeEvent } from "../ports/crmRealtimePublisher.js";
import {
  matchesConnectionScope,
  matchesCrmQueueVisibility,
} from "./crmQueueVisibility.js";

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
        event.connectionId,
      );
    case "conversationCycle":
      return (
        matchesCrmQueueVisibility(
          visibility,
          boundary
            ? boundary.assignedUserId
            : event.conversationCycle.assignedUserId,
          event.connectionId,
        ) ||
        (visibility.kind === "assigned" &&
          matchesConnectionScope(visibility, event.connectionId) &&
          event.revokedUserId === visibility.userId)
      );
    case "message_status":
      return matchesCrmQueueVisibility(
        visibility,
        boundary ? boundary.assignedUserId : event.assignedUserId,
        event.connectionId,
      );
    case "presence":
      return matchesCrmQueueVisibility(
        visibility,
        boundary ? boundary.assignedUserId : event.assignedUserId,
        event.connectionId,
      );
    case "connection_status":
      return matchesConnectionScope(visibility, event.connectionId);
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
  if (event.type === "message_status" || event.type === "presence") {
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
    (observed.boundary.revision < current.revision ||
      (observed.boundary.revision === current.revision &&
        observed.boundary.assignedUserId !== current.assignedUserId))
  ) {
    return;
  }
  if (current?.revision !== undefined && observed.boundary.revision === null) {
    return;
  }
  boundaries.set(observed.cycleKey, observed.boundary);
}

export function isStaleCrmRealtimeAssignmentEvent(
  boundaries: Map<string, CrmRealtimeAssignmentBoundary>,
  event: CrmRealtimeEvent,
) {
  const observed = readCrmRealtimeConversationCycleBoundary(event);
  if (!observed || observed.boundary.revision === null) return false;
  const current = boundaries.get(observed.cycleKey);
  return Boolean(
    current?.revision !== null &&
    current?.revision !== undefined &&
    (observed.boundary.revision < current.revision ||
      (observed.boundary.revision === current.revision &&
        observed.boundary.assignedUserId !== current.assignedUserId)),
  );
}

export function filterCrmRealtimeReplayByHistoricalVisibility<
  T extends { event: CrmRealtimeEvent },
>(
  history: readonly T[],
  startIndex: number,
  visibility: CrmQueueVisibility,
): T[] {
  const boundaries = new Map<string, CrmRealtimeAssignmentBoundary>();
  const visible: T[] = [];
  history.forEach((item, index) => {
    const isStale = isStaleCrmRealtimeAssignmentEvent(boundaries, item.event);
    updateCrmRealtimeAssignmentBoundary(boundaries, item.event);
    if (index < startIndex) return;
    if (visibility.kind === "assigned" && isStale) return;
    const observed = readCrmRealtimeConversationCycleBoundary(item.event);
    if (
      matchesCrmRealtimeQueueVisibility(
        visibility,
        item.event,
        observed ? boundaries.get(observed.cycleKey) : undefined,
      )
    ) {
      visible.push(item);
    }
  });
  if (visibility.kind !== "assigned") return visible;
  const lastRevocationByCycle = new Map<string, number>();
  visible.forEach((item, index) => {
    if (
      item.event.type !== "conversationCycle" ||
      item.event.revokedUserId !== visibility.userId
    ) {
      return;
    }
    const observed = readCrmRealtimeConversationCycleBoundary(item.event);
    if (observed) lastRevocationByCycle.set(observed.cycleKey, index);
  });
  return visible.filter((item, index) => {
    const observed = readCrmRealtimeConversationCycleBoundary(item.event);
    if (!observed) return true;
    const lastRevocation = lastRevocationByCycle.get(observed.cycleKey);
    return lastRevocation === undefined || index >= lastRevocation;
  });
}

function assignmentBoundaryKey(event: CrmRealtimeEvent, cycleId: string) {
  return `${event.tenantId}:${event.storeId}:${cycleId}`;
}

function readRevision(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}
