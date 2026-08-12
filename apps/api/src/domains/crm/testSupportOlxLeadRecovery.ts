import { randomUUID } from "node:crypto";
import type {
  CrmLead,
  CrmLeadActivity,
  CrmRepository,
} from "./ports/crmRepository.js";
import type {
  CrmProviderWebhookEvent,
  CrmWebhookEventRepository,
} from "./ports/crmWebhookEventRepository.js";

export function createOlxLeadRecoveryTestRepository(input: {
  beforeCreateLead?: () => Promise<void>;
}) {
  const leads: CrmLead[] = [];
  const activities: CrmLeadActivity[] = [];
  const identities = new Map<string, string>();
  let createLeadCalls = 0;
  const repository = {
    async createLeadIdempotently(candidate) {
      createLeadCalls += 1;
      await input.beforeCreateLead?.();
      const key = [
        candidate.tenantId,
        candidate.storeId,
        candidate.source,
        candidate.sourceIdentityKey,
      ].join(":");
      const existing = leads.find((lead) => lead.id === identities.get(key));
      if (existing) return { created: false, lead: existing };
      const now = new Date();
      const lead: CrmLead = {
        assignedUserId: null,
        buyerEmail: candidate.buyerEmail ?? null,
        buyerName: candidate.buyerName ?? null,
        buyerPhone: candidate.buyerPhone ?? null,
        createdAt: now,
        id: randomUUID(),
        lastInteractionAt: null,
        listingId: null,
        metadata: candidate.metadata ?? {},
        pipelineId: null,
        pipelineStageId: null,
        source: candidate.source,
        status: "new",
        storeId: candidate.storeId,
        tenantId: candidate.tenantId,
        updatedAt: now,
        vehicleTitle: null,
      };
      leads.push(lead);
      identities.set(key, lead.id);
      return { created: true, lead };
    },
    async createActivityIdempotently(candidate) {
      const existing = activities.find(
        (activity) =>
          activity.storeId === candidate.storeId &&
          activity.idempotencyKey === candidate.idempotencyKey,
      );
      if (existing) return { activity: existing, created: false };
      const now = new Date();
      const activity: CrmLeadActivity = {
        activityType: candidate.activityType,
        content: candidate.content,
        createdAt: now,
        createdByUserId: candidate.createdByUserId ?? null,
        direction: candidate.direction ?? "internal",
        id: randomUUID(),
        idempotencyFingerprint: candidate.idempotencyFingerprint,
        idempotencyKey: candidate.idempotencyKey,
        leadId: candidate.leadId,
        metadata: candidate.metadata ?? {},
        occurredAt: candidate.occurredAt ?? now,
        priority: candidate.priority ?? 0,
        storeId: candidate.storeId,
        tenantId: candidate.tenantId,
        updatedAt: now,
      };
      activities.push(activity);
      return { activity, created: true };
    },
  } satisfies Pick<
    CrmRepository,
    "createActivityIdempotently" | "createLeadIdempotently"
  >;
  return {
    createLeadCalls: () => createLeadCalls,
    leads,
    repository: repository as CrmRepository,
  };
}

export function createOlxLeadRecoveryTestWebhookRepository() {
  const events: CrmProviderWebhookEvent[] = [];
  const repository = {
    async claimDueEvents(input) {
      const claimed = events
        .filter(
          (event) =>
            event.eventType === input.eventType &&
            event.provider === input.provider &&
            event.processingAttempts < input.maxAttempts &&
            (event.status === "received" ||
              event.status === "failed" ||
              (event.status === "processing" &&
                (!event.processingStartedAt ||
                  event.processingStartedAt <= input.staleBefore))),
        )
        .slice(0, input.limit);
      for (const event of claimed) {
        Object.assign(event, {
          errorMessage: null,
          processedAt: null,
          processingAttempts: event.processingAttempts + 1,
          processingStartedAt: input.now,
          processingToken: input.processingToken,
          status: "processing" as const,
          updatedAt: input.now,
        });
      }
      return claimed;
    },
    async list(input) {
      return events.filter(
        (event) =>
          event.storeId === input.storeId && event.tenantId === input.tenantId,
      );
    },
    async recordReceived(input) {
      const existing = events.find(
        (event) =>
          event.provider === input.provider &&
          event.environment === input.environment &&
          event.connectionId === (input.connectionId ?? null) &&
          event.providerEventId === input.providerEventId,
      );
      if (existing) {
        return {
          created: false,
          divergentReplay:
            input.payloadDigest !== undefined &&
            input.payloadDigest !== existing.payloadDigest,
          event: existing,
        };
      }
      const now = new Date();
      const event: CrmProviderWebhookEvent = {
        connectionId: input.connectionId ?? null,
        createdAt: now,
        environment: input.environment,
        errorMessage: null,
        eventType: input.eventType,
        id: randomUUID(),
        payload: input.payload,
        payloadDigest: input.payloadDigest ?? null,
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
      return { created: true, divergentReplay: false, event };
    },
    async updateStatus(input) {
      const event = events.find((candidate) => candidate.id === input.eventId);
      if (
        !event ||
        (input.processingToken &&
          (event.status !== "processing" ||
            event.processingToken !== input.processingToken))
      ) {
        return null;
      }
      Object.assign(event, {
        errorMessage: input.errorMessage ?? null,
        ...(input.payload ? { payload: input.payload } : {}),
        processedAt: new Date(),
        processingStartedAt: null,
        processingToken: null,
        status: input.status,
        updatedAt: new Date(),
      });
      return event;
    },
  } satisfies Pick<
    CrmWebhookEventRepository,
    "claimDueEvents" | "list" | "recordReceived" | "updateStatus"
  >;
  return repository as unknown as CrmWebhookEventRepository;
}
