import type {
  FiscalWebhookEvent,
  FiscalWebhookRepository,
} from "../../../../domains/fiscal/ports/fiscalWebhookRepository.js";

export function createMemoryFiscalWebhookRepository(): FiscalWebhookRepository {
  const events = new Map<string, FiscalWebhookEvent>();
  return {
    async recordReceived(input) {
      const existing = events.get(input.providerEventId);
      if (existing) return { created: false, event: existing };
      const event = {
        id: crypto.randomUUID(),
        providerEventId: input.providerEventId,
        status: "received" as const,
      };
      events.set(input.providerEventId, event);
      return { created: true, event };
    },
    async updateStatus(input) {
      const event = [...events.values()].find(
        (candidate) => candidate.id === input.eventId,
      );
      if (event) event.status = input.status;
    },
  };
}
