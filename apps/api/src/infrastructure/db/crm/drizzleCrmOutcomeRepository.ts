import { and, eq, sql } from "drizzle-orm";
import { crmLeadOutcomes } from "@lojaveiculosv2/db/src/schema/crmLeadOutcomes.js";
import type {
  CrmLeadOutcome,
  CrmOutcomeRepository,
} from "../../../domains/crm/ports/crmOutcomeRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

export function createDrizzleCrmOutcomeRepository(
  db: DrizzleCrmClient,
): CrmOutcomeRepository {
  return {
    async create(input) {
      const [row] = await db
        .insert(crmLeadOutcomes)
        .values(input)
        .onConflictDoNothing()
        .returning();
      if (row) return toOutcome(row);
      const [existing] = await db
        .select()
        .from(crmLeadOutcomes)
        .where(
          and(
            eq(crmLeadOutcomes.commandId, input.commandId),
            eq(crmLeadOutcomes.storeId, input.storeId),
            eq(crmLeadOutcomes.tenantId, input.tenantId),
          ),
        )
        .limit(1);
      if (!existing)
        throw new Error("CRM lead outcome command receipt was not visible.");
      return toOutcome(existing);
    },
    async findByCommandId(input) {
      const [row] = await db
        .select()
        .from(crmLeadOutcomes)
        .where(
          and(
            eq(crmLeadOutcomes.commandId, input.commandId),
            eq(crmLeadOutcomes.storeId, input.storeId),
            eq(crmLeadOutcomes.tenantId, input.tenantId),
          ),
        )
        .limit(1);
      return row ? toOutcome(row) : null;
    },
    async lockLead(input) {
      await db.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${input.tenantId}:${input.storeId}:${input.leadId}:crm-lead-outcome`}))`,
      );
    },
  };
}

function toOutcome(row: typeof crmLeadOutcomes.$inferSelect): CrmLeadOutcome {
  return {
    actorId: row.actorId,
    actorKind: row.actorKind,
    channel: row.channel,
    commandId: row.commandId,
    createdAt: row.createdAt,
    id: row.id,
    leadId: row.leadId,
    lossNote: row.lossNote,
    lossReason: row.lossReason,
    nextPipelineStageId: row.nextPipelineStageId,
    originSessionId: row.originSessionId,
    outcome: row.outcome,
    previousPipelineStageId: row.previousPipelineStageId,
    requestFingerprint: row.requestFingerprint,
    result: row.result,
    saleId: row.saleId,
    storeId: row.storeId as CrmLeadOutcome["storeId"],
    tenantId: row.tenantId as CrmLeadOutcome["tenantId"],
  };
}
