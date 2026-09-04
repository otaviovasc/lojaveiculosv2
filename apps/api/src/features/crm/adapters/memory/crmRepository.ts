import type {
  CrmLead,
  CrmLeadActivity,
  CrmRepository,
} from "../../../../domains/crm/ports/crmRepository.js";
import { whatsappPhoneLookupCandidates } from "../../../../domains/crm/whatsapp/whatsappPhone.js";
import {
  applyMemoryLeadUpdate,
  filterMemoryCrmLeads,
  findScopedMemoryLead,
  isMemoryLeadAfterCursor,
} from "./crmRepositorySupport.js";

export function createMemoryCrmRepository(): CrmRepository {
  const leads: CrmLead[] = [];
  const activities: CrmLeadActivity[] = [];
  const leadIdentityIds = new Map<string, string>();

  return {
    async createActivity(input) {
      const now = new Date();
      const activity: CrmLeadActivity = {
        activityType: input.activityType,
        content: input.content,
        createdAt: now,
        createdByUserId: input.createdByUserId ?? null,
        direction: input.direction ?? "internal",
        id: crypto.randomUUID(),
        idempotencyFingerprint: null,
        idempotencyKey: null,
        leadId: input.leadId,
        metadata: input.metadata ?? {},
        occurredAt: input.occurredAt ?? now,
        priority: input.priority ?? 0,
        storeId: input.storeId,
        tenantId: input.tenantId,
        updatedAt: now,
      };
      activities.push(activity);
      return activity;
    },
    async createActivityIdempotently(input) {
      const existing = activities.find(
        (activity) =>
          activity.storeId === input.storeId &&
          activity.idempotencyKey === input.idempotencyKey,
      );
      if (existing) return { activity: existing, created: false };

      const now = new Date();
      const activity: CrmLeadActivity = {
        activityType: input.activityType,
        content: input.content,
        createdAt: now,
        createdByUserId: input.createdByUserId ?? null,
        direction: input.direction ?? "internal",
        id: crypto.randomUUID(),
        idempotencyFingerprint: input.idempotencyFingerprint,
        idempotencyKey: input.idempotencyKey,
        leadId: input.leadId,
        metadata: input.metadata ?? {},
        occurredAt: input.occurredAt ?? now,
        priority: input.priority ?? 0,
        storeId: input.storeId,
        tenantId: input.tenantId,
        updatedAt: now,
      };
      activities.push(activity);
      return { activity, created: true };
    },
    async createLead(input) {
      const now = new Date();
      const lead: CrmLead = {
        assignedUserId: input.assignedUserId ?? null,
        buyerEmail: input.buyerEmail ?? null,
        buyerName: input.buyerName ?? null,
        buyerPhone: input.buyerPhone ?? null,
        createdAt: now,
        id: crypto.randomUUID(),
        lastInteractionAt: null,
        listingId: input.listingId ?? null,
        metadata: input.metadata ?? {},
        pipelineId: input.pipelineId ?? null,
        pipelineStageId: input.pipelineStageId ?? null,
        source: input.source,
        status: "new",
        storeId: input.storeId,
        tenantId: input.tenantId,
        updatedAt: now,
        vehicleTitle: null,
      };
      leads.push(lead);
      return lead;
    },
    async createLeadIdempotently(input) {
      const identity = [
        input.tenantId,
        input.storeId,
        input.source,
        input.sourceIdentityKey,
      ].join(":");
      const existingId = leadIdentityIds.get(identity);
      const existing = existingId
        ? findScopedMemoryLead(leads, existingId, input)
        : undefined;
      if (existing) return { created: false, lead: existing };

      const lead = await this.createLead(input);
      leadIdentityIds.set(identity, lead.id);
      return { created: true, lead };
    },
    async countLeadsByPipeline(input) {
      return leads.filter(
        (lead) =>
          lead.storeId === input.storeId &&
          lead.tenantId === input.tenantId &&
          lead.pipelineId === input.pipelineId,
      ).length;
    },
    async countLeadsByPipelineStages(input) {
      if (!input.stageIds.length) return 0;
      const stageIds = new Set(input.stageIds);
      return leads.filter(
        (lead) =>
          lead.storeId === input.storeId &&
          lead.tenantId === input.tenantId &&
          Boolean(lead.pipelineStageId && stageIds.has(lead.pipelineStageId)),
      ).length;
    },
    async countLeads(input) {
      return filterMemoryCrmLeads(leads, input).length;
    },
    async findLeadById(input) {
      return findScopedMemoryLead(leads, input.leadId, input) ?? null;
    },
    async findLeadByPhone(input) {
      const candidates = whatsappPhoneLookupCandidates(input.buyerPhone);
      return (
        leads
          .filter((lead) => lead.storeId === input.storeId)
          .filter((lead) => lead.tenantId === input.tenantId)
          .filter((lead) => !["won", "lost", "archived"].includes(lead.status))
          .filter((lead) => matchesLeadPhone(lead.buyerPhone, candidates))
          .sort(
            (left, right) =>
              right.updatedAt.getTime() - left.updatedAt.getTime(),
          )[0] ?? null
      );
    },
    async listActivities(input) {
      return activities
        .filter((activity) => activity.leadId === input.leadId)
        .filter((activity) => activity.storeId === input.storeId)
        .filter((activity) => activity.tenantId === input.tenantId)
        .sort(
          (left, right) =>
            right.occurredAt.getTime() - left.occurredAt.getTime(),
        )
        .slice(0, input.limit);
    },
    async listLeadBoard(input) {
      const stages = new Map<string, CrmLead[]>();
      for (const lead of filterMemoryCrmLeads(leads, input)) {
        if (!lead.pipelineStageId) continue;
        const items = stages.get(lead.pipelineStageId) ?? [];
        items.push(lead);
        stages.set(lead.pipelineStageId, items);
      }
      return [...stages.entries()].map(([pipelineStageId, items]) => ({
        items: items.slice(0, input.stageLimit),
        pipelineStageId,
        total: items.length,
      }));
    },
    async listLeads(input) {
      const offset = input.cursor ? 0 : (input.offset ?? 0);
      return filterMemoryCrmLeads(leads, input)
        .filter((lead) => isMemoryLeadAfterCursor(lead, input.cursor))
        .slice(offset, offset + input.limit);
    },
    async updateLead(input) {
      const lead = findScopedMemoryLead(leads, input.leadId, input);
      if (!lead) throw new Error(`Lead not found: ${input.leadId}`);

      applyMemoryLeadUpdate(lead, input);
      lead.updatedAt = new Date();
      return lead;
    },
  };
}

function matchesLeadPhone(value: string | null, candidates: string[]) {
  if (!value) return false;
  return candidates.includes(value.replace(/\D/g, ""));
}
