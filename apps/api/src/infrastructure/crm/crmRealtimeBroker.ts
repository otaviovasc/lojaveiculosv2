import { randomUUID } from "node:crypto";
import type {
  CrmRealtimeBroker,
  CrmRealtimeEventEnvelope,
  CrmRealtimeEvent,
  CrmRealtimeReplayInput,
  CrmRealtimeSubscription,
  CrmRealtimeTicket,
} from "../../domains/crm/ports/crmRealtimePublisher.js";

const ticketTtlMs = 60_000;
const maxBufferedEvents = 500;

export type LocalCrmRealtimeBroker = CrmRealtimeBroker & {
  publishEnvelope: (envelope: CrmRealtimeEventEnvelope) => Promise<void>;
};

export function createCrmRealtimeBroker(): LocalCrmRealtimeBroker {
  const subscriptions = new Map<string, CrmRealtimeSubscription>();
  const history: CrmRealtimeEventEnvelope[] = [];
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
      if (!history.some((event) => event.id === envelope.id)) {
        history.push(envelope);
        trimHistory(history);
      }
      for (const subscription of subscriptions.values()) {
        if (!matchesSubscription(subscription, envelope.event)) continue;
        subscription.onEvent(envelope);
      }
    },
    async replay(input) {
      return replayFromHistory(history, input);
    },
    async resolveTicket(ticket) {
      purgeExpiredTickets(tickets);
      return tickets.get(ticket) ?? null;
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
) {
  if (subscription.storeId !== event.storeId) return false;
  if (subscription.tenantId !== event.tenantId) return false;
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
  const matching = history.filter((envelope) =>
    matchesReplayScope(input, envelope.event),
  );
  const cursorIndex = matching.findIndex(
    (envelope) => envelope.id === input.sinceEventId,
  );
  const replay = cursorIndex >= 0 ? matching.slice(cursorIndex + 1) : matching;
  return replay.slice(-(input.limit ?? maxBufferedEvents));
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

function trimHistory(history: CrmRealtimeEventEnvelope[]) {
  if (history.length <= maxBufferedEvents) return;
  history.splice(0, history.length - maxBufferedEvents);
}
