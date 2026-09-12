import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "../_shared.js";
import { stores, tenants } from "../identity.js";
import { crmChannelConnections } from "./authorization.js";
import { crmExternalBotActionCommands } from "./execution.js";
import {
  crmCoreMigrationFindingKind,
  crmExternalBotProviderEffectState,
  transportProvider,
} from "./enums.js";
import { revisionCheck, revisionColumn } from "./revision.js";
import { scopedStoreForeignKey } from "./scoped.js";

export const crmExternalBotProviderEffects = pgTable(
  "crm_external_bot_provider_effects",
  {
    ...lifecycleColumns,
    attemptCount: integer("attempt_count").notNull().default(0),
    commandId: uuid("command_id")
      .notNull()
      .references(() => crmExternalBotActionCommands.id),
    effectType: varchar("effect_type", { length: 120 }).notNull(),
    externalEffectId: varchar("external_effect_id", { length: 191 }),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    lastErrorCode: varchar("last_error_code", { length: 120 }),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    provider: transportProvider("provider").notNull(),
    providerAttemptedAt: timestamp("provider_attempted_at", {
      withTimezone: true,
    }),
    providerConnectionId: uuid("provider_connection_id")
      .notNull()
      .references(() => crmChannelConnections.id),
    result: jsonb("result").notNull().default({}),
    revision: revisionColumn(),
    state: crmExternalBotProviderEffectState("state")
      .notNull()
      .default("accepted"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(
      table,
      "crm_external_bot_provider_effects_store_tenant_fk",
    ),
    foreignKey({
      columns: [
        table.tenantId,
        table.storeId,
        table.commandId,
        table.providerConnectionId,
        table.provider,
      ],
      foreignColumns: [
        crmExternalBotActionCommands.tenantId,
        crmExternalBotActionCommands.storeId,
        crmExternalBotActionCommands.id,
        crmExternalBotActionCommands.providerConnectionId,
        crmExternalBotActionCommands.provider,
      ],
      name: "crm_external_bot_provider_effects_semantic_command_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.providerConnectionId],
      foreignColumns: [
        crmChannelConnections.tenantId,
        crmChannelConnections.storeId,
        crmChannelConnections.id,
      ],
      name: "crm_external_bot_provider_effects_scoped_connection_fk",
    }),
    check(
      "crm_external_bot_provider_effects_attempt_count_nonnegative",
      sql`${table.attemptCount} >= 0`,
    ),
    revisionCheck(
      table.revision,
      "crm_external_bot_provider_effects_revision_nonnegative",
    ),
    uniqueIndex("crm_external_bot_provider_effects_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("crm_external_bot_provider_effects_idempotency_unique").on(
      table.tenantId,
      table.storeId,
      table.provider,
      table.idempotencyKey,
    ),
    uniqueIndex("crm_external_bot_provider_effects_external_unique")
      .on(table.provider, table.providerConnectionId, table.externalEffectId)
      .where(sql`${table.externalEffectId} IS NOT NULL`),
    index("crm_external_bot_provider_effects_retry_idx").on(
      table.state,
      table.nextAttemptAt,
    ),
  ],
);

export const crmExternalBotInternalEffects = pgTable(
  "crm_external_bot_internal_effects",
  {
    ...lifecycleColumns,
    commandId: uuid("command_id")
      .notNull()
      .references(() => crmExternalBotActionCommands.id),
    effectType: varchar("effect_type", { length: 120 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    result: jsonb("result").notNull().default({}),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(
      table,
      "crm_external_bot_internal_effects_store_tenant_fk",
    ),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.commandId],
      foreignColumns: [
        crmExternalBotActionCommands.tenantId,
        crmExternalBotActionCommands.storeId,
        crmExternalBotActionCommands.id,
      ],
      name: "crm_external_bot_internal_effects_scoped_command_fk",
    }),
    uniqueIndex("crm_external_bot_internal_effects_command_unique").on(
      table.tenantId,
      table.storeId,
      table.commandId,
    ),
    uniqueIndex("crm_external_bot_internal_effects_idempotency_unique").on(
      table.tenantId,
      table.storeId,
      table.idempotencyKey,
    ),
  ],
);

export const crmCoreMigrationFindings = pgTable(
  "crm_core_migration_findings",
  {
    ...lifecycleColumns,
    details: jsonb("details").notNull().default({}),
    findingKey: varchar("finding_key", { length: 191 }).notNull(),
    findingKind: crmCoreMigrationFindingKind("finding_kind").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    revision: revisionColumn(),
    sourceId: varchar("source_id", { length: 191 }),
    sourceTable: varchar("source_table", { length: 120 }).notNull(),
    storeId: uuid("store_id").references(() => stores.id),
    tenantId: uuid("tenant_id").references(() => tenants.id),
  },
  (table) => [
    check(
      "crm_core_migration_findings_scope_check",
      sql`(${table.storeId} IS NULL AND ${table.tenantId} IS NULL) OR (${table.storeId} IS NOT NULL AND ${table.tenantId} IS NOT NULL)`,
    ),
    scopedStoreForeignKey(table, "crm_core_migration_findings_store_tenant_fk"),
    revisionCheck(
      table.revision,
      "crm_core_migration_findings_revision_nonnegative",
    ),
    uniqueIndex("crm_core_migration_findings_key_unique").on(table.findingKey),
    index("crm_core_migration_findings_open_idx").on(
      table.findingKind,
      table.resolvedAt,
    ),
  ],
);
