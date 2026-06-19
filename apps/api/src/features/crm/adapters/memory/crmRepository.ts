import type {
  CreateCrmLeadInput,
  CreateLeadActivityInput,
  CrmLead,
  CrmLeadActivity,
  CrmRepository,
  ListCrmLeadsInput,
  ListLeadActivitiesInput,
  UpdateCrmLeadInput,
} from "../../../../domains/crm/ports/crmRepository.js";

export function createMemoryCrmRepository(): CrmRepository {
  const leads: CrmLead[] = [];
  const activities: CrmLeadActivity[] = [];

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
    async findLeadById(input) {
      return findScopedLead(leads, input.leadId, input) ?? null;
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
    async listLeads(input) {
      return leads
        .filter((lead) => lead.storeId === input.storeId)
        .filter((lead) => lead.tenantId === input.tenantId)
        .filter((lead) => !input.status || lead.status === input.status)
        .filter((lead) => matchesSearch(lead, input.search))
        .sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        )
        .slice(0, input.limit);
    },
    async updateLead(input) {
      const lead = findScopedLead(leads, input.leadId, input);
      if (!lead) throw new Error(`Lead not found: ${input.leadId}`);

      applyLeadUpdate(lead, input);
      lead.updatedAt = new Date();
      return lead;
    },
  };
}

function findScopedLead(
  leads: CrmLead[],
  leadId: string,
  scope: Pick<CreateCrmLeadInput, "storeId" | "tenantId">,
) {
  return leads.find(
    (lead) =>
      lead.id === leadId &&
      lead.storeId === scope.storeId &&
      lead.tenantId === scope.tenantId,
  );
}

function applyLeadUpdate(lead: CrmLead, input: UpdateCrmLeadInput) {
  if (input.assignedUserId !== undefined) {
    lead.assignedUserId = input.assignedUserId;
  }
  if (input.buyerEmail !== undefined) lead.buyerEmail = input.buyerEmail;
  if (input.buyerName !== undefined) lead.buyerName = input.buyerName;
  if (input.buyerPhone !== undefined) lead.buyerPhone = input.buyerPhone;
  if (input.metadata) lead.metadata = input.metadata;
  if (input.status) lead.status = input.status;
}

function matchesSearch(lead: CrmLead, search: ListCrmLeadsInput["search"]) {
  if (!search) return true;
  const needle = search.toLowerCase();
  return [lead.buyerName, lead.buyerPhone, lead.buyerEmail, lead.vehicleTitle]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(needle));
}
