import type {
  CountCrmLeadsInput,
  CreateCrmLeadInput,
  CrmLead,
  ListCrmLeadsInput,
  UpdateCrmLeadInput,
} from "../../../../domains/crm/ports/crmRepository.js";

export function filterMemoryCrmLeads(
  leads: CrmLead[],
  input: CountCrmLeadsInput | ListCrmLeadsInput,
) {
  return leads
    .filter((lead) => lead.storeId === input.storeId)
    .filter((lead) => lead.tenantId === input.tenantId)
    .filter((lead) => !input.listingId || lead.listingId === input.listingId)
    .filter((lead) => !input.pipelineId || lead.pipelineId === input.pipelineId)
    .filter(
      (lead) =>
        !input.pipelineStageId ||
        lead.pipelineStageId === input.pipelineStageId,
    )
    .filter((lead) => !input.source || lead.source === input.source)
    .filter((lead) => Boolean(input.status) || lead.status !== "archived")
    .filter((lead) => !input.status || lead.status === input.status)
    .filter((lead) => matchesSearch(lead, input.search))
    .filter(
      (lead) =>
        !input.responseState || lead.responseState === input.responseState,
    )
    .filter(
      (lead) =>
        !input.humanAttendanceState ||
        lead.humanAttendanceState === input.humanAttendanceState,
    )
    .filter(
      (lead) =>
        !input.inactiveDays ||
        (lead.lastInteractionAt !== null &&
          lead.lastInteractionAt.getTime() <=
            Date.now() - input.inactiveDays * 86400000),
    )
    .sort((a, b) => {
      if (input.sortBy === "next_task") {
        const left = a.nextTask ? Date.parse(a.nextTask.dueAt) : Infinity;
        const right = b.nextTask ? Date.parse(b.nextTask.dueAt) : Infinity;
        if (left !== right) return left - right;
      }
      if (input.sortBy === "created_at") {
        const difference = b.createdAt.getTime() - a.createdAt.getTime();
        if (difference) return difference;
      }
      return compareLeadsDescending(a, b);
    });
}

export function isMemoryLeadAfterCursor(
  lead: CrmLead,
  cursor: ListCrmLeadsInput["cursor"],
  sortBy?: ListCrmLeadsInput["sortBy"],
) {
  if (!cursor) return true;
  if (sortBy === "next_task") {
    const value = lead.nextTask ? Date.parse(lead.nextTask.dueAt) : Infinity;
    const boundary = cursor.sortAt?.getTime() ?? Infinity;
    if (value !== boundary) return value > boundary;
  }
  if (
    sortBy === "created_at" &&
    cursor.sortAt &&
    lead.createdAt.getTime() !== cursor.sortAt.getTime()
  )
    return lead.createdAt < cursor.sortAt;
  const leadTimestamp = lead.updatedAt.getTime();
  const cursorTimestamp = cursor.updatedAt.getTime();
  return (
    leadTimestamp < cursorTimestamp ||
    (leadTimestamp === cursorTimestamp && lead.id < cursor.id)
  );
}

export function findScopedMemoryLead(
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

export function applyMemoryLeadUpdate(
  lead: CrmLead,
  input: UpdateCrmLeadInput,
) {
  if (input.assignedUserId !== undefined) {
    lead.assignedUserId = input.assignedUserId;
  }
  if (input.birthDate !== undefined) lead.birthDate = input.birthDate;
  if (input.buyerEmail !== undefined) lead.buyerEmail = input.buyerEmail;
  if (input.buyerName !== undefined) lead.buyerName = input.buyerName;
  if (input.buyerPhone !== undefined) lead.buyerPhone = input.buyerPhone;
  if (input.metadata) lead.metadata = input.metadata;
  if (input.pipelineId !== undefined) lead.pipelineId = input.pipelineId;
  if (input.pipelineStageId !== undefined) {
    lead.pipelineStageId = input.pipelineStageId;
  }
  if (input.status) lead.status = input.status;
}

function compareLeadsDescending(left: CrmLead, right: CrmLead) {
  const timestampDifference =
    right.updatedAt.getTime() - left.updatedAt.getTime();
  return timestampDifference || right.id.localeCompare(left.id);
}

function matchesSearch(lead: CrmLead, search: ListCrmLeadsInput["search"]) {
  if (!search) return true;
  const needle = search.toLowerCase();
  return [lead.buyerName, lead.buyerPhone, lead.buyerEmail, lead.vehicleTitle]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(needle));
}
