import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { stores, tenants } from "./identity.js";
import { leads } from "./leads.js";
import { sales } from "./sales.js";
import { crmPipelineStages } from "./crmPipeline.js";
import { crmWhatsappChannel, crmWhatsappSessions } from "./crmWhatsapp.js";

export const crmLeadOutcomeKind = pgEnum("crm_lead_outcome_kind", [
  "follow_up",
  "lost",
  "won",
]);
export const crmLeadOutcomeResult = pgEnum("crm_lead_outcome_result", [
  "applied",
  "superseded",
]);
export const crmLeadOutcomeLossReason = pgEnum("crm_lead_outcome_loss_reason", [
  "no_response",
  "price",
  "financing_not_approved",
  "trade_in_valuation",
  "vehicle_unavailable",
  "bought_elsewhere",
  "no_longer_interested",
  "invalid_contact",
  "other",
]);

/** Append-only business ledger. Repository ports intentionally expose no update/delete. */
export const crmLeadOutcomes = pgTable(
  "crm_lead_outcomes",
  {
    ...lifecycleColumns,
    actorId: varchar("actor_id", { length: 191 }).notNull(),
    actorKind: varchar("actor_kind", { length: 40 }).notNull(),
    channel: crmWhatsappChannel("channel"),
    commandId: varchar("command_id", { length: 191 }).notNull(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    lossNote: text("loss_note"),
    lossReason: crmLeadOutcomeLossReason("loss_reason"),
    nextPipelineStageId: uuid("next_pipeline_stage_id").references(
      () => crmPipelineStages.id,
    ),
    originSessionId: uuid("origin_session_id").references(
      () => crmWhatsappSessions.id,
    ),
    outcome: crmLeadOutcomeKind("outcome").notNull(),
    previousPipelineStageId: uuid("previous_pipeline_stage_id").references(
      () => crmPipelineStages.id,
    ),
    requestFingerprint: varchar("request_fingerprint", {
      length: 64,
    }).notNull(),
    result: crmLeadOutcomeResult("result").notNull(),
    saleId: uuid("sale_id").references(() => sales.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    check(
      "crm_lead_outcomes_loss_fields_consistent",
      sql`(${table.outcome} = 'lost' AND ${table.lossReason} IS NOT NULL) OR (${table.outcome} <> 'lost' AND ${table.lossReason} IS NULL AND ${table.lossNote} IS NULL)`,
    ),
    check(
      "crm_lead_outcomes_other_note_present",
      sql`${table.lossReason} <> 'other' OR NULLIF(BTRIM(${table.lossNote}), '') IS NOT NULL`,
    ),
    check(
      "crm_lead_outcomes_sale_consistent",
      sql`(${table.outcome} = 'won' AND ${table.saleId} IS NOT NULL) OR (${table.outcome} <> 'won' AND ${table.saleId} IS NULL)`,
    ),
    check(
      "crm_lead_outcomes_origin_consistent",
      sql`${table.outcome} = 'won' OR ${table.originSessionId} IS NOT NULL`,
    ),
    uniqueIndex("crm_lead_outcomes_scope_command_unique").on(
      table.tenantId,
      table.storeId,
      table.commandId,
    ),
    index("crm_lead_outcomes_lead_history_idx").on(
      table.tenantId,
      table.storeId,
      table.leadId,
      table.createdAt,
    ),
  ],
);
