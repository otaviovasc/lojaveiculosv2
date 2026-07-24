import type {
  CreateLeadVisitInput,
  CrmLeadVisit,
  CrmVisitRepository,
  ListLeadVisitsInput,
  UpdateLeadVisitInput,
} from "../../../../domains/crm/ports/crmVisitRepository.js";

export function createMemoryCrmVisitRepository(
  initialVisits: readonly CrmLeadVisit[] = [],
): CrmVisitRepository {
  const visits = [...initialVisits];

  return {
    async createVisit(input) {
      const now = new Date();
      const visit: CrmLeadVisit = {
        assignedUserId: input.assignedUserId ?? null,
        createdAt: now,
        id: crypto.randomUUID(),
        leadId: input.leadId,
        listingId: input.listingId ?? null,
        notes: input.notes ?? null,
        scheduledAt: input.scheduledAt,
        status: input.status ?? "scheduled",
        storeId: input.storeId,
        tenantId: input.tenantId,
        updatedAt: now,
        vehicleTitle: input.vehicleTitle ?? null,
      };
      visits.push(visit);
      return visit;
    },
    async findVisitById(input) {
      return findScopedVisit(visits, input.visitId, input) ?? null;
    },
    async listVisits(input) {
      return visits
        .filter((visit) => visit.storeId === input.storeId)
        .filter((visit) => visit.tenantId === input.tenantId)
        .filter((visit) => !input.leadId || visit.leadId === input.leadId)
        .filter((visit) => !input.status || visit.status === input.status)
        .filter((visit) => !input.from || visit.scheduledAt >= input.from)
        .filter((visit) => !input.to || visit.scheduledAt <= input.to)
        .sort(
          (left, right) =>
            left.scheduledAt.getTime() - right.scheduledAt.getTime(),
        )
        .slice(input.offset, input.offset + input.limit);
    },
    async updateVisit(input) {
      const visit = findScopedVisit(visits, input.visitId, input);
      if (!visit) return null;
      applyVisitUpdate(visit, input);
      visit.updatedAt = new Date();
      return visit;
    },
  };
}

function findScopedVisit(
  visits: CrmLeadVisit[],
  visitId: string,
  scope: Pick<CreateLeadVisitInput, "storeId" | "tenantId">,
) {
  return visits.find(
    (visit) =>
      visit.id === visitId &&
      visit.storeId === scope.storeId &&
      visit.tenantId === scope.tenantId,
  );
}

function applyVisitUpdate(visit: CrmLeadVisit, input: UpdateLeadVisitInput) {
  if (input.assignedUserId !== undefined) {
    visit.assignedUserId = input.assignedUserId;
  }
  if (input.notes !== undefined) visit.notes = input.notes;
  if (input.listingId !== undefined) visit.listingId = input.listingId;
  if (input.scheduledAt !== undefined) visit.scheduledAt = input.scheduledAt;
  if (input.status !== undefined) visit.status = input.status;
  if (input.vehicleTitle !== undefined) visit.vehicleTitle = input.vehicleTitle;
}
