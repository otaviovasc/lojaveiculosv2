import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  leadActivities,
  leadVehicleInterests,
  leads,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  CreateCrmLeadInput,
  CreateLeadActivityInput,
  CrmRepository,
  UpdateCrmLeadInput,
} from "../../../domains/crm/ports/crmRepository.js";
import { toActivity, toLead } from "./drizzleCrmMappers.js";
import {
  findLeadVehicleReference,
  findLeadVehicleReferences,
  findVehicleTitle,
} from "./drizzleCrmVehicleReferences.js";

export type DrizzleCrmClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleCrmRepository(
  db: DrizzleCrmClient,
): CrmRepository {
  return {
    async createActivity(input) {
      const [row] = await db
        .insert(leadActivities)
        .values({
          activityType: input.activityType,
          content: input.content,
          createdByUserId: input.createdByUserId ?? null,
          direction: input.direction ?? "internal",
          leadId: input.leadId,
          metadata: input.metadata ?? {},
          ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
          priority: input.priority ?? 0,
          storeId: input.storeId,
          tenantId: input.tenantId,
        })
        .returning();
      if (!row) throw new Error("Drizzle adapter did not return activity.");
      return toActivity(row);
    },
    async createLead(input) {
      const vehicleTitle = await findVehicleTitle(db, {
        listingId: input.listingId,
        storeId: input.storeId,
        tenantId: input.tenantId,
      });
      const [row] = await db
        .insert(leads)
        .values({
          assignedUserId: input.assignedUserId ?? null,
          buyerEmail: input.buyerEmail ?? null,
          buyerName: input.buyerName ?? null,
          buyerPhone: input.buyerPhone ?? null,
          metadata: input.metadata ?? {},
          source: input.source,
          storeId: input.storeId,
          tenantId: input.tenantId,
        })
        .returning();
      if (!row) throw new Error("Drizzle adapter did not return lead.");

      if (input.listingId) {
        await db.insert(leadVehicleInterests).values({
          leadId: row.id,
          listingId: input.listingId,
          storeId: input.storeId,
          tenantId: input.tenantId,
        });
      }

      return toLead(row, {
        listingId: input.listingId ?? null,
        vehicleTitle,
      });
    },
    async findLeadById(input) {
      const [row] = await db
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.id, input.leadId),
            eq(leads.storeId, input.storeId),
            eq(leads.tenantId, input.tenantId),
            eq(leads.isDeleted, false),
          ),
        )
        .limit(1);

      if (!row) return null;
      return toLead(
        row,
        await findLeadVehicleReference(db, {
          leadId: row.id,
          storeId: input.storeId,
          tenantId: input.tenantId,
        }),
      );
    },
    async listActivities(input) {
      const rows = await db
        .select()
        .from(leadActivities)
        .where(
          and(
            eq(leadActivities.leadId, input.leadId),
            eq(leadActivities.storeId, input.storeId),
            eq(leadActivities.tenantId, input.tenantId),
          ),
        )
        .orderBy(desc(leadActivities.occurredAt))
        .limit(input.limit);

      return rows.map(toActivity);
    },
    async listLeads(input) {
      const filters = [
        eq(leads.storeId, input.storeId),
        eq(leads.tenantId, input.tenantId),
        eq(leads.isDeleted, false),
      ];
      if (input.listingId) {
        const linkedRows = await db
          .select({ leadId: leadVehicleInterests.leadId })
          .from(leadVehicleInterests)
          .where(
            and(
              eq(leadVehicleInterests.listingId, input.listingId),
              eq(leadVehicleInterests.storeId, input.storeId),
              eq(leadVehicleInterests.tenantId, input.tenantId),
            ),
          );
        if (!linkedRows.length) return [];
        filters.push(inArray(leads.id, linkedRows.map((row) => row.leadId)));
      }
      if (input.source) filters.push(eq(leads.source, input.source));
      if (input.status) filters.push(eq(leads.status, input.status));
      const searchFilter = input.search
        ? or(
            ilike(leads.buyerName, `%${input.search}%`),
            ilike(leads.buyerPhone, `%${input.search}%`),
            ilike(leads.buyerEmail, `%${input.search}%`),
          )
        : undefined;

      const rows = await db
        .select()
        .from(leads)
        .where(and(...filters, ...(searchFilter ? [searchFilter] : [])))
        .orderBy(desc(leads.updatedAt))
        .offset(input.offset ?? 0)
        .limit(input.limit);

      const references = await findLeadVehicleReferences(db, {
        leadIds: rows.map((row) => row.id),
        storeId: input.storeId,
        tenantId: input.tenantId,
      });
      return rows.map((row) => toLead(row, references.get(row.id)));
    },
    async updateLead(input) {
      const [row] = await db
        .update(leads)
        .set({
          ...(input.assignedUserId !== undefined
            ? { assignedUserId: input.assignedUserId }
            : {}),
          ...(input.buyerEmail !== undefined
            ? { buyerEmail: input.buyerEmail }
            : {}),
          ...(input.buyerName !== undefined
            ? { buyerName: input.buyerName }
            : {}),
          ...(input.buyerPhone !== undefined
            ? { buyerPhone: input.buyerPhone }
            : {}),
          ...(input.metadata ? { metadata: input.metadata } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.status ? { lastInteractionAt: new Date() } : {}),
        })
        .where(
          and(
            eq(leads.id, input.leadId),
            eq(leads.storeId, input.storeId),
            eq(leads.tenantId, input.tenantId),
            eq(leads.isDeleted, false),
          ),
        )
        .returning();
      if (!row) throw new Error(`Lead not found: ${input.leadId}`);
      return toLead(
        row,
        await findLeadVehicleReference(db, {
          leadId: row.id,
          storeId: input.storeId,
          tenantId: input.tenantId,
        }),
      );
    },
  };
}
