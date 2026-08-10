import { randomUUID } from "node:crypto";
import type {
  CrmProviderWebhookEventProvider,
  CrmProviderWebhookEvent,
  CrmWebhookEventRepository,
} from "../../../../domains/crm/ports/crmWebhookEventRepository.js";

export function createMemoryCrmWebhookEventRepository(
  initialEvents: readonly CrmProviderWebhookEvent[] = [],
): CrmWebhookEventRepository {
  const events = [...initialEvents];

  return {
    async claimForProcessing(input) {
      const event = events.find((item) => item.id === input.eventId);
      if (!event) return null;
      const claimable =
        event.status === "failed" ||
        event.status === "received" ||
        (input.allowIgnored === true && event.status === "ignored") ||
        (event.status === "processing" &&
          (!event.processingStartedAt ||
            event.processingStartedAt <= input.staleBefore));
      if (!claimable) return null;
      event.errorMessage = null;
      event.processedAt = null;
      event.processingAttempts += 1;
      event.processingStartedAt = input.processingStartedAt;
      event.processingToken = input.processingToken;
      event.status = "processing";
      event.updatedAt = input.processingStartedAt;
      return event;
    },
    async findById(input) {
      return events.find((event) => matchesScope(event, input)) ?? null;
    },
    async list(input) {
      return events
        .filter((event) => matchesList(event, input))
        .sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        )
        .slice(input.offset ?? 0, (input.offset ?? 0) + (input.limit ?? 50));
    },
    async recordReceived(input) {
      const existing = events.find(
        (event) =>
          event.provider === input.provider &&
          event.environment === input.environment &&
          event.providerEventId === input.providerEventId,
      );
      if (existing) return { created: false, event: existing };

      const now = new Date();
      const event: CrmProviderWebhookEvent = {
        connectionId: input.connectionId ?? null,
        createdAt: now,
        environment: input.environment,
        errorMessage: null,
        eventType: input.eventType,
        id: randomUUID(),
        payload: input.payload,
        processingAttempts: 0,
        processingStartedAt: null,
        processingToken: null,
        processedAt: null,
        provider: input.provider,
        providerEventId: input.providerEventId,
        status: "received",
        storeId: input.storeId ?? null,
        tenantId: input.tenantId ?? null,
        updatedAt: now,
      };
      events.push(event);
      return { created: true, event };
    },
    async updateStatus(input) {
      const event = events.find((item) => item.id === input.eventId);
      if (!event) return null;
      if (
        input.processingToken &&
        (event.status !== "processing" ||
          event.processingToken !== input.processingToken)
      ) {
        return null;
      }
      event.errorMessage = input.errorMessage ?? null;
      event.processedAt = new Date();
      event.processingStartedAt = null;
      event.processingToken = null;
      event.status = input.status;
      event.updatedAt = new Date();
      return event;
    },
  };
}

function matchesScope(
  event: CrmProviderWebhookEvent,
  input: { eventId: string; storeId: string; tenantId: string },
) {
  return (
    event.id === input.eventId &&
    event.storeId === input.storeId &&
    event.tenantId === input.tenantId
  );
}

function matchesList(
  event: CrmProviderWebhookEvent,
  input: {
    connectionId?: string | null;
    eventType?: string;
    provider?: CrmProviderWebhookEventProvider;
    status?: string;
    storeId: string;
    tenantId: string;
  },
) {
  if (event.storeId !== input.storeId) return false;
  if (event.tenantId !== input.tenantId) return false;
  if (input.connectionId && event.connectionId !== input.connectionId)
    return false;
  if (input.eventType && event.eventType !== input.eventType) return false;
  if (input.provider && event.provider !== input.provider) return false;
  if (input.status && event.status !== input.status) return false;
  return true;
}
