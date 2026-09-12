import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLead } from "../../ports/crmRepository.js";
import type { CrmLeadVisit } from "../../ports/crmVisitRepository.js";
import {
  CrmLeadNotFoundError,
  CrmVisitSessionMismatchError,
  CrmVisitVehicleNotFoundError,
  getCrmRepository,
  getCrmVehicleInventory,
  getCrmConversationRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "./serviceSupport.js";

export async function findVisitLeadOrThrow(
  context: ServiceContext,
  leadId: string,
  ports: CrmServicePorts,
): Promise<CrmLead> {
  const scope = requireCrmScope(context);
  const lead = await getCrmRepository(ports).findLeadById({
    leadId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!lead) throw new CrmLeadNotFoundError(leadId);
  return lead;
}

export async function resolveVisitSessionLeadId(
  context: ServiceContext,
  cycleId: string,
  ports: CrmServicePorts,
): Promise<string> {
  const scope = requireCrmScope(context);
  const [conversationCycle] = await getCrmConversationRepository(
    ports,
  ).listConversationCycles({
    limit: 1,
    offset: 0,
    cycleId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!conversationCycle?.leadId) throw new CrmVisitSessionMismatchError();
  return conversationCycle.leadId;
}

export async function assertVisitSessionMatchesLead(
  context: ServiceContext,
  input: { leadId: string; cycleId?: string },
  ports: CrmServicePorts,
) {
  if (!input.cycleId) return;
  const sessionLeadId = await resolveVisitSessionLeadId(
    context,
    input.cycleId,
    ports,
  );
  if (sessionLeadId !== input.leadId) throw new CrmVisitSessionMismatchError();
}

export function visitActivityMetadata(
  visit: CrmLeadVisit,
  extra: Record<string, unknown> = {},
) {
  return {
    kind: "visit",
    listingId: visit.listingId,
    scheduledAt: visit.scheduledAt.toISOString(),
    visitId: visit.id,
    visitStatus: visit.status,
    ...extra,
  };
}

export async function resolveVisitVehicleInterest(
  context: ServiceContext,
  listingId: string | null,
  ports: CrmServicePorts,
): Promise<{ listingId: string | null; vehicleTitle: string | null }> {
  if (!listingId) return { listingId: null, vehicleTitle: null };
  const scope = requireCrmScope(context);
  const listing = await getCrmVehicleInventory(
    ports,
  ).listingRepository.findById({
    listingId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!listing) throw new CrmVisitVehicleNotFoundError(listingId);
  return { listingId: listing.id, vehicleTitle: listing.title };
}
