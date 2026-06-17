import type { AuditEvent, AuditSink } from "./contracts.js";

export type MemoryAuditSink = AuditSink & {
  clear: () => void;
  events: readonly AuditEvent[];
};

export function createNoopAuditSink(): AuditSink {
  return {
    record: async () => undefined,
  };
}

export function createMemoryAuditSink(
  initialEvents: readonly AuditEvent[] = [],
): MemoryAuditSink {
  const events = [...initialEvents];

  return {
    clear: () => {
      events.length = 0;
    },
    get events() {
      return events;
    },
    record: async (event) => {
      events.push(event);
    },
  };
}
