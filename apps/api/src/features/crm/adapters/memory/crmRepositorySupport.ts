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
    .sort(compareLeadsDescending);
}

export function isMemoryLeadAfterCursor(
  lead: CrmLead,
  cursor: ListCrmLeadsInput["cursor"],
) {
  if (!cursor) return true;
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
