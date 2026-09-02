import { randomUUID } from "node:crypto";
import type {
  CrmRealtimeBroker,
  CrmRealtimeEventEnvelope,
  CrmRealtimeEvent,
  CrmRealtimeReplayInput,
  CrmRealtimeSubscription,
  CrmRealtimeTicket,
} from "../../domains/crm/ports/crmRealtimePublisher.js";
import {
  filterCrmRealtimeReplayByHistoricalVisibility,
  isStaleCrmRealtimeAssignmentEvent,
  matchesCrmRealtimeQueueVisibility,
  readCrmRealtimeConversationCycleBoundary,
  updateCrmRealtimeAssignmentBoundary,
  type CrmRealtimeAssignmentBoundary,
} from "../../domains/crm/messaging/crmQueueVisibilityRealtime.js";

const ticketTtlMs = 60_000;
const maxBufferedEvents = 500;

export type LocalCrmRealtimeBroker = CrmRealtimeBroker & {
  publishEnvelope: (envelope: CrmRealtimeEventEnvelope) => Promise<void>;
};

export function createCrmRealtimeBroker(): LocalCrmRealtimeBroker {
  const subscriptions = new Map<string, CrmRealtimeSubscription>();
  const history: CrmRealtimeEventEnvelope[] = [];
  const assignmentBoundaries = new Map<string, CrmRealtimeAssignmentBoundary>();
  const tickets = new Map<string, CrmRealtimeTicket>();

  const broker: LocalCrmRealtimeBroker = {
    async issueTicket(input) {
      purgeExpiredTickets(tickets);
      const ticket: CrmRealtimeTicket = {
        ...input,
        expiresAt: new Date(Date.now() + ticketTtlMs),
        ticket: randomUUID(),
      };
      tickets.set(ticket.ticket, ticket);
      return ticket;
    },
    async publish(event) {
      await broker.publishEnvelope(createEnvelope(event));
    },
    async publishEnvelope(envelope) {
      const hasStaleAssignment = isStaleCrmRealtimeAssignmentEvent(
        assignmentBoundaries,
        envelope.event,
      );
      updateCrmRealtimeAssignmentBoundary(assignmentBoundaries, envelope.event);
      if (
        envelope.event.type !== "presence" &&
        !history.some((event) => event.id === envelope.id)
      ) {
        history.push(envelope);
        trimHistory(history);
      }
      for (const subscription of subscriptions.values()) {
        if (
          !matchesSubscription(
            subscription,
            envelope.event,
            assignmentBoundaries,
            hasStaleAssignment,
          )
        )
          continue;
        subscription.onEvent(envelope);
      }
    },
    async replay(input) {
      return replayFromHistory(history, input);
    },
    async resolveTicket(ticket) {
      purgeExpiredTickets(tickets);
      const resolved = tickets.get(ticket) ?? null;
      if (resolved) tickets.delete(ticket);
      return resolved;
    },
    subscribe(subscription) {
      const id = randomUUID();
      subscriptions.set(id, subscription);
      return () => {
        subscriptions.delete(id);
      };
    },
  };
  return broker;
}

function purgeExpiredTickets(tickets: Map<string, CrmRealtimeTicket>) {
  const now = Date.now();
  for (const [ticket, scope] of tickets.entries()) {
    if (scope.expiresAt.getTime() <= now) tickets.delete(ticket);
  }
}

function matchesSubscription(
  subscription: CrmRealtimeSubscription,
  event: CrmRealtimeEvent,
  boundaries: Map<string, CrmRealtimeAssignmentBoundary>,
  hasStaleAssignment: boolean,
) {
  if (subscription.storeId !== event.storeId) return false;
  if (subscription.tenantId !== event.tenantId) return false;
  if (hasStaleAssignment && subscription.queueVisibility.kind === "assigned") {
    return false;
  }
  if (
    !matchesCrmRealtimeQueueVisibility(
      subscription.queueVisibility,
      event,
      resolveBoundary(boundaries, event),
    )
  ) {
    return false;
  }
  if (!subscription.connectionId) return true;
  return subscription.connectionId === event.connectionId;
}

function createEnvelope(event: CrmRealtimeEvent): CrmRealtimeEventEnvelope {
  return {
    createdAt: new Date().toISOString(),
    event,
    id: `${Date.now()}-${randomUUID()}`,
  };
}

function replayFromHistory(
  history: CrmRealtimeEventEnvelope[],
  input: CrmRealtimeReplayInput,
) {
  if (!input.sinceEventId) return [];
  const scoped = history.filter((envelope) =>
    matchesReplayScope(input, envelope.event),
  );
  const cursorIndex = scoped.findIndex(
    (envelope) => envelope.id === input.sinceEventId,
  );
  const visible = filterCrmRealtimeReplayByHistoricalVisibility(
    scoped,
    cursorIndex >= 0 ? cursorIndex + 1 : 0,
    input.queueVisibility,
  );
  return selectReplayWindow(
    visible,
    input.queueVisibility,
    input.limit ?? maxBufferedEvents,
  );
}

function matchesReplayScope(
  input: CrmRealtimeReplayInput,
  event: CrmRealtimeEvent,
) {
  if (input.storeId !== event.storeId) return false;
  if (input.tenantId !== event.tenantId) return false;
  if (!input.connectionId) return true;
  return input.connectionId === event.connectionId;
}

function resolveBoundary(
  boundaries: Map<string, CrmRealtimeAssignmentBoundary>,
  event: CrmRealtimeEvent,
) {
  const observed = readCrmRealtimeConversationCycleBoundary(event);
  return observed ? boundaries.get(observed.cycleKey) : undefined;
}

function selectReplayWindow(
  events: CrmRealtimeEventEnvelope[],
  visibility: CrmRealtimeReplayInput["queueVisibility"],
  limit: number,
) {
  const includesRevocation =
    visibility.kind === "assigned" &&
    events.some(
      ({ event }) =>
        event.type === "conversationCycle" &&
        event.revokedUserId === visibility.userId,
    );
  return includesRevocation ? events.slice(-limit) : events.slice(0, limit);
}

function trimHistory(history: CrmRealtimeEventEnvelope[]) {
  if (history.length <= maxBufferedEvents) return;
  history.splice(0, history.length - maxBufferedEvents);
}
