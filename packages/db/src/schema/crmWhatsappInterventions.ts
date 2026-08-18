import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { providerConnections } from "./crmCore/authorization.js";
import {
  crmWhatsappHumanAttendanceState,
  crmWhatsappSessions,
} from "./crmWhatsapp.js";
import { stores, tenants } from "./identity.js";

const includeCrmScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

export const crmWhatsappInterventionActorKind = pgEnum(
  "crm_whatsapp_intervention_actor_kind",
  ["user", "support", "provider", "bot", "system"],
);

export const crmWhatsappInterventionLedger = pgTable(
  "crm_whatsapp_intervention_ledger",
  {
    ...lifecycleColumns,
    actorId: varchar("actor_id", { length: 191 }).notNull(),
    actorKind: crmWhatsappInterventionActorKind("actor_kind").notNull(),
    connectionId: uuid("connection_id").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    interventionId: uuid("intervention_id").notNull(),
    nextState: crmWhatsappHumanAttendanceState("next_state"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    previousState: crmWhatsappHumanAttendanceState("previous_state"),
    reason: text("reason").notNull(),
    requestFingerprint: varchar("request_fingerprint", {
      length: 128,
    }).notNull(),
    sessionId: uuid("session_id").notNull(),
    sessionRevision: bigint("session_revision", { mode: "number" }).notNull(),
    source: varchar("source", { length: 80 }).notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    check(
      "crm_whatsapp_intervention_ledger_revision_positive",
      sql`${table.sessionRevision} > 0`,
    ),
    check(
      "crm_whatsapp_intervention_ledger_request_fingerprint_nonempty",
      sql`btrim(${table.requestFingerprint}) <> ''`,
    ),
    check(
      "crm_whatsapp_intervention_ledger_state_changed",
      sql`${table.previousState} IS DISTINCT FROM ${table.nextState}`,
    ),
    ...(includeCrmScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.tenantId, table.storeId, table.connectionId],
            foreignColumns: [
              providerConnections.tenantId,
              providerConnections.storeId,
              providerConnections.id,
            ],
            name: "crm_whatsapp_intervention_ledger_scoped_connection_fk",
          }),
          foreignKey({
            columns: [
              table.tenantId,
              table.storeId,
              table.connectionId,
              table.sessionId,
            ],
            foreignColumns: [
              crmWhatsappSessions.tenantId,
              crmWhatsappSessions.storeId,
              crmWhatsappSessions.connectionId,
              crmWhatsappSessions.id,
            ],
            name: "crm_whatsapp_intervention_ledger_scoped_session_fk",
          }),
        ]
      : []),
    uniqueIndex("crm_whatsapp_intervention_ledger_scope_key_unique").on(
      table.tenantId,
      table.storeId,
      table.sessionId,
      table.idempotencyKey,
    ),
    uniqueIndex("crm_whatsapp_intervention_ledger_scope_revision_unique").on(
      table.tenantId,
      table.storeId,
      table.sessionId,
      table.sessionRevision,
    ),
    uniqueIndex("crm_whatsapp_intervention_ledger_scope_transition_unique").on(
      table.tenantId,
      table.storeId,
      table.sessionId,
      table.interventionId,
      table.sessionRevision,
    ),
    index("crm_whatsapp_intervention_ledger_session_occurred_idx").on(
      table.sessionId,
      table.occurredAt,
    ),
  ],
);
