import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  lte,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { leadVehicleInterests, leads } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  CountCrmLeadsInput,
  ListCrmLeadBoardInput,
  ListCrmLeadsInput,
} from "../../../domains/crm/ports/crmRepository.js";
import { findLeadIdsByVehicleTitle } from "./drizzleCrmLeadSearch.js";
import { toLead } from "./drizzleCrmMappers.js";
import { findLeadVehicleReferences } from "./drizzleCrmVehicleReferences.js";

type CrmDatabase = PostgresJsDatabase<typeof schema>;

export async function countCrmLeads(
  db: CrmDatabase,
  input: CountCrmLeadsInput,
) {
  const filters = await buildCrmLeadFilters(db, input);
  if (!filters) return 0;

  const [row] = await db
    .select({ value: count() })
    .from(leads)
    .where(and(...filters));
  return row?.value ?? 0;
}

export async function listCrmLeads(db: CrmDatabase, input: ListCrmLeadsInput) {
  const filters = await buildCrmLeadFilters(db, input);
  if (!filters) return [];

  if (input.cursor) {
    const cursorFilter = or(
      lt(leads.updatedAt, input.cursor.updatedAt),
      and(
        eq(leads.updatedAt, input.cursor.updatedAt),
        lt(leads.id, input.cursor.id),
      ),
    );
    if (cursorFilter) filters.push(cursorFilter);
  }

  const rows = await db
    .select()
    .from(leads)
    .where(and(...filters))
    .orderBy(desc(leads.updatedAt), desc(leads.id))
    .offset(input.cursor ? 0 : (input.offset ?? 0))
    .limit(input.limit);

  const references = await findLeadVehicleReferences(db, {
    leadIds: rows.map((row) => row.id),
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  return rows.map((row) => toLead(row, references.get(row.id)));
}

export async function listCrmLeadBoard(
  db: CrmDatabase,
  input: ListCrmLeadBoardInput,
) {
  const filters = await buildCrmLeadFilters(db, input);
  if (!filters) return [];

  const ranked = db
    .select({
      ...getTableColumns(leads),
      stageRank: sql<number>`row_number() over (
          partition by ${leads.pipelineStageId}
          order by ${leads.updatedAt} desc, ${leads.id} desc
        )`.as("stage_rank"),
      stageTotal: sql<number>`count(*) over (
          partition by ${leads.pipelineStageId}
        )`.as("stage_total"),
    })
    .from(leads)
    .where(and(...filters))
    .as("ranked_crm_leads");

  const rows = await db
    .select()
    .from(ranked)
    .where(lte(ranked.stageRank, input.stageLimit));
  const references = await findLeadVehicleReferences(db, {
    leadIds: rows.map((row) => row.id),
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  const stages = new Map<
    string,
    { items: ReturnType<typeof toLead>[]; total: number }
  >();
  for (const row of rows) {
    const pipelineStageId = row.pipelineStageId;
    if (!pipelineStageId) continue;
    const stage = stages.get(pipelineStageId) ?? {
      items: [],
      total: Number(row.stageTotal),
    };
    stage.items.push(toLead(row, references.get(row.id)));
    stages.set(pipelineStageId, stage);
  }
  return [...stages.entries()].map(([pipelineStageId, stage]) => ({
    ...stage,
    pipelineStageId,
  }));
}

async function buildCrmLeadFilters(
  db: CrmDatabase,
  input: CountCrmLeadsInput | ListCrmLeadBoardInput | ListCrmLeadsInput,
): Promise<SQL[] | null> {
  const filters: SQL[] = [
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
    if (!linkedRows.length) return null;
    filters.push(
      inArray(
        leads.id,
        linkedRows.map((row) => row.leadId),
      ),
    );
  }

  if (input.pipelineId) filters.push(eq(leads.pipelineId, input.pipelineId));
  if (input.pipelineStageId) {
    filters.push(eq(leads.pipelineStageId, input.pipelineStageId));
  }
  if (input.source) filters.push(eq(leads.source, input.source));
  if (input.status) filters.push(eq(leads.status, input.status));

  if (input.search) {
    const vehicleLeadIds = await findLeadIdsByVehicleTitle(db, {
      search: input.search,
      storeId: input.storeId,
      tenantId: input.tenantId,
    });
    const searchFilter = or(
      ilike(leads.buyerName, `%${input.search}%`),
      ilike(leads.buyerPhone, `%${input.search}%`),
      ilike(leads.buyerEmail, `%${input.search}%`),
      ...(vehicleLeadIds.length ? [inArray(leads.id, vehicleLeadIds)] : []),
    );
    if (searchFilter) filters.push(searchFilter);
  }

  return filters;
}
