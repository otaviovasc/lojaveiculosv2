import type { AnalyticsReportAvailability } from "../../domains/analytics/ports/analyticsRepository.js";

export const available = { status: "available" } as const;

export const marketingAvailability: AnalyticsReportAvailability = {
  reason:
    "O V2 ainda não possui eventos persistidos de visitas e cliques para este período.",
  status: "unavailable",
};

export function restricted(permission: string): AnalyticsReportAvailability {
  return {
    reason: `Este perfil não possui a permissão ${permission}.`,
    status: "restricted",
  };
}

export function emptyFinance(availability: AnalyticsReportAvailability) {
  return {
    availability,
    categoryBreakdown: [],
    paidOutflowCents: 0,
    pendingOutflowCents: 0,
    plannedOutflowCents: 0,
    plannedRevenueCents: 0,
    realizedBalanceCents: 0,
    receivedRevenueCents: 0,
  };
}

export function emptyOwner(availability: AnalyticsReportAvailability) {
  return {
    availability,
    completeSalesCount: 0,
    missingAcquisitionCount: 0,
    officialMarginCents: 0,
    vehicles: [],
  };
}

export function emptyCrm(availability: AnalyticsReportAvailability) {
  return {
    availability,
    averageInteractionsPerLead: 0,
    conversionRate: 0,
    interactionCount: 0,
    lostLeads: 0,
    totalLeads: 0,
    wonLeads: 0,
  };
}

export function emptyDocuments(availability: AnalyticsReportAvailability) {
  return {
    availability,
    byKind: [],
    issued: 0,
    pendingSignature: 0,
    signed: 0,
    total: 0,
  };
}
