import { documents, leadActivities, leads } from "@lojaveiculosv2/db";
import { and, eq, sql } from "drizzle-orm";
import {
  available,
  emptyCrm,
  emptyDocuments,
  restricted,
} from "./runtimeAnalyticsReportAvailability.js";
import {
  dayStart,
  nextDay,
  scoped,
  type DashboardScope,
  type RuntimeAnalyticsClient,
} from "./runtimeAnalyticsSupport.js";

export async function getCrmReport(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
  canRead: boolean,
) {
  if (!canRead) return emptyCrm(restricted("crm.pipeline.read"));
  const from = dayStart(input.period.from);
  const to = nextDay(input.period.to);
  const [[leadRow], [activityRow]] = await Promise.all([
    db
      .select({
        lostLeads: sql<number>`count(*) filter (where ${leads.status} = 'lost')::int`,
        totalLeads: sql<number>`count(*)::int`,
        wonLeads: sql<number>`count(*) filter (where ${leads.status} = 'won')::int`,
      })
      .from(leads)
      .where(
        and(
          scoped(leads, input),
          sql`${leads.createdAt} >= ${from}`,
          sql`${leads.createdAt} < ${to}`,
          sql`${leads.isDeleted} = false`,
        ),
      ),
    db
      .select({ interactionCount: sql<number>`count(*)::int` })
      .from(leadActivities)
      .innerJoin(leads, eq(leadActivities.leadId, leads.id))
      .where(
        and(
          scoped(leadActivities, input),
          sql`${leadActivities.occurredAt} >= ${from}`,
          sql`${leadActivities.occurredAt} < ${to}`,
          sql`${leads.isDeleted} = false`,
        ),
      ),
  ]);
  const totalLeads = leadRow?.totalLeads ?? 0;
  const wonLeads = leadRow?.wonLeads ?? 0;
  const interactionCount = activityRow?.interactionCount ?? 0;
  return {
    availability: available,
    averageInteractionsPerLead:
      totalLeads > 0 ? interactionCount / totalLeads : 0,
    conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
    interactionCount,
    lostLeads: leadRow?.lostLeads ?? 0,
    totalLeads,
    wonLeads,
  };
}

export async function getDocumentsReport(
  db: RuntimeAnalyticsClient,
  input: DashboardScope,
  canRead: boolean,
) {
  if (!canRead) return emptyDocuments(restricted("documents.read"));
  const from = dayStart(input.period.from);
  const to = nextDay(input.period.to);
  const [totals, byKind] = await Promise.all([
    db
      .select({
        issued: sql<number>`count(*) filter (where ${documents.status} = 'issued')::int`,
        pendingSignature: sql<number>`count(*) filter (where ${documents.status} = 'pending_signature')::int`,
        signed: sql<number>`count(*) filter (where ${documents.status} = 'signed')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(documents)
      .where(
        and(
          scoped(documents, input),
          sql`${documents.uploadedAt} >= ${from}`,
          sql`${documents.uploadedAt} < ${to}`,
          sql`${documents.isDeleted} = false`,
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int`, key: documents.kind })
      .from(documents)
      .where(
        and(
          scoped(documents, input),
          sql`${documents.uploadedAt} >= ${from}`,
          sql`${documents.uploadedAt} < ${to}`,
          sql`${documents.isDeleted} = false`,
        ),
      )
      .groupBy(documents.kind),
  ]);
  return {
    availability: available,
    byKind,
    issued: totals[0]?.issued ?? 0,
    pendingSignature: totals[0]?.pendingSignature ?? 0,
    signed: totals[0]?.signed ?? 0,
    total: totals[0]?.total ?? 0,
  };
}
