import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmLead } from "../../ports/crmRepository.js";
import type { CrmLeadVisit } from "../../ports/crmVisitRepository.js";
import {
  CrmLeadNotFoundError,
  CrmVisitSessionMismatchError,
  CrmVisitVehicleNotFoundError,
  getCrmRepository,
  getCrmVehicleInventory,
  getCrmWhatsappRepository,
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
  sessionId: string,
  ports: CrmServicePorts,
): Promise<string> {
  const scope = requireCrmScope(context);
  const [session] = await getCrmWhatsappRepository(ports).listSessions({
    limit: 1,
    offset: 0,
    sessionId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!session?.leadId) throw new CrmVisitSessionMismatchError();
  return session.leadId;
}

export async function assertVisitSessionMatchesLead(
  context: ServiceContext,
  input: { leadId: string; sessionId?: string },
  ports: CrmServicePorts,
) {
  if (!input.sessionId) return;
  const sessionLeadId = await resolveVisitSessionLeadId(
    context,
    input.sessionId,
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
