import { and, asc, eq, gte, lte, type SQL } from "drizzle-orm";
import { leadVisits } from "@lojaveiculosv2/db";
import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type {
  CrmLeadVisit,
  CrmVisitRepository,
  ListLeadVisitsInput,
} from "../../../domains/crm/ports/crmVisitRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function createDrizzleCrmVisitRepository(
  db: DrizzleCrmClient,
): CrmVisitRepository {
  return {
    async createVisit(input) {
      const [row] = await db
        .insert(leadVisits)
        .values({
          assignedUserId: input.assignedUserId ?? null,
          leadId: input.leadId,
          listingId: input.listingId ?? null,
          notes: input.notes ?? null,
          scheduledAt: input.scheduledAt,
          status: input.status ?? "scheduled",
          storeId: input.storeId,
          tenantId: input.tenantId,
          vehicleTitle: input.vehicleTitle ?? null,
        })
        .returning();
      if (!row) throw new Error("Drizzle adapter did not return visit.");
      return toVisit(row);
    },
    async findVisitById(input) {
      const [row] = await db
        .select()
        .from(leadVisits)
        .where(
          and(
            eq(leadVisits.id, input.visitId),
            eq(leadVisits.storeId, input.storeId),
            eq(leadVisits.tenantId, input.tenantId),
          ),
        )
        .limit(1);
      return row ? toVisit(row) : null;
    },
    async listVisits(input) {
      const rows = await db
        .select()
        .from(leadVisits)
        .where(and(...visitFilters(input)))
        .orderBy(asc(leadVisits.scheduledAt))
        .offset(input.offset)
        .limit(input.limit);
      return rows.map(toVisit);
    },
    async updateVisit(input) {
      const [row] = await db
        .update(leadVisits)
        .set({
          ...(input.assignedUserId !== undefined
            ? { assignedUserId: input.assignedUserId }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.listingId !== undefined
            ? { listingId: input.listingId }
            : {}),
          ...(input.scheduledAt !== undefined
            ? { scheduledAt: input.scheduledAt }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.vehicleTitle !== undefined
            ? { vehicleTitle: input.vehicleTitle }
            : {}),
        })
        .where(
          and(
            eq(leadVisits.id, input.visitId),
            eq(leadVisits.storeId, input.storeId),
            eq(leadVisits.tenantId, input.tenantId),
          ),
        )
        .returning();
      return row ? toVisit(row) : null;
    },
  };
}

function visitFilters(input: ListLeadVisitsInput): SQL[] {
  const filters: SQL[] = [
    eq(leadVisits.storeId, input.storeId),
    eq(leadVisits.tenantId, input.tenantId),
  ];
  if (input.leadId) filters.push(eq(leadVisits.leadId, input.leadId));
  if (input.status) filters.push(eq(leadVisits.status, input.status));
  if (input.from) filters.push(gte(leadVisits.scheduledAt, input.from));
  if (input.to) filters.push(lte(leadVisits.scheduledAt, input.to));
  return filters;
}

function toVisit(row: typeof leadVisits.$inferSelect): CrmLeadVisit {
  return {
    assignedUserId: row.assignedUserId as UserId | null,
    createdAt: row.createdAt,
    id: row.id,
    leadId: row.leadId,
    listingId: row.listingId,
    notes: row.notes,
    scheduledAt: row.scheduledAt,
    status: row.status as CrmLeadVisit["status"],
    storeId: row.storeId as StoreId,
    tenantId: row.tenantId as TenantId,
    updatedAt: row.updatedAt,
    vehicleTitle: row.vehicleTitle,
  };
}
