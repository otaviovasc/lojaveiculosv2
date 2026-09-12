import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "../_shared.js";
import { stores, tenants, users } from "../identity.js";
import { crmChannelConnections } from "./authorization.js";
import { conversationThreads } from "./conversations.js";
import { crmExternalBotActionCommands } from "./execution.js";
import { messagingChannel, transportProvider } from "./enums.js";
import { revisionCheck, revisionColumn } from "./revision.js";
import { scopedStoreForeignKey } from "./scoped.js";

export const crmExternalBotEventOutbox = pgTable(
  "crm_external_bot_event_outbox",
  {
    ...lifecycleColumns,
    actionClass: varchar("action_class", { length: 24 }).notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    grantExpiresAt: timestamp("grant_expires_at", {
      withTimezone: true,
    }).notNull(),
    grantToken: text("grant_token"),
    integrationId: uuid("integration_id").notNull(),
    lastErrorCode: varchar("last_error_code", { length: 120 }),
    modelVersion: varchar("model_version", { length: 120 }).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    payload: jsonb("payload").notNull().default({}),
    provider: transportProvider("provider").notNull(),
    providerConnectionId: uuid("provider_connection_id")
      .notNull()
      .references(() => crmChannelConnections.id),
    revision: revisionColumn(),
    state: varchar("state", { length: 24 }).notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => conversationThreads.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "crm_external_bot_event_outbox_scope_fk"),
    foreignKey({
      columns: [
        table.tenantId,
        table.storeId,
        table.providerConnectionId,
        table.provider,
      ],
      foreignColumns: [
        crmChannelConnections.tenantId,
        crmChannelConnections.storeId,
        crmChannelConnections.id,
        crmChannelConnections.provider,
      ],
      name: "crm_external_bot_event_outbox_semantic_connection_fk",
    }),
    foreignKey({
      columns: [
        table.tenantId,
        table.storeId,
        table.threadId,
        table.providerConnectionId,
      ],
      foreignColumns: [
        conversationThreads.tenantId,
        conversationThreads.storeId,
        conversationThreads.id,
        conversationThreads.providerConnectionId,
      ],
      name: "crm_external_bot_event_outbox_semantic_thread_fk",
    }),
    check(
      "crm_external_bot_event_outbox_state_check",
      sql`${table.state} IN ('pending','processing','delivered','dead_letter')`,
    ),
    revisionCheck(
      table.revision,
      "crm_external_bot_event_outbox_revision_nonnegative",
    ),
    index("crm_external_bot_event_outbox_claim_idx").on(
      table.state,
      table.nextAttemptAt,
    ),
  ],
);

export const crmExternalBotKillSwitches = pgTable(
  "crm_external_bot_kill_switches",
  {
    ...lifecycleColumns,
    actionType: varchar("action_type", { length: 120 }),
    enabled: boolean("enabled").notNull().default(true),
    level: varchar("level", { length: 32 }).notNull(),
    revision: revisionColumn(),
    scopeValue: varchar("scope_value", { length: 191 }),
  },
  (table) => [
    check(
      "crm_external_bot_kill_switch_level_check",
      sql`${table.level} IN ('global','tenant','store','integration','connection','thread','provider','action','action_class','pii_export','model_version')`,
    ),
    revisionCheck(
      table.revision,
      "crm_external_bot_kill_switches_revision_nonnegative",
    ),
    index("crm_external_bot_kill_switch_lookup_idx").on(
      table.enabled,
      table.level,
      table.scopeValue,
      table.actionType,
    ),
  ],
);

export const crmExternalBotProposals = pgTable(
  "crm_external_bot_proposals",
  {
    ...lifecycleColumns,
    actionType: varchar("action_type", { length: 120 }).notNull(),
    commandId: uuid("command_id")
      .notNull()
      .references(() => crmExternalBotActionCommands.id),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedByUserId: uuid("decided_by_user_id").references(() => users.id),
    decisionReason: varchar("decision_reason", { length: 500 }),
    decisionState: varchar("decision_state", { length: 16 })
      .notNull()
      .default("pending"),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    payload: jsonb("payload").notNull(),
    revision: revisionColumn(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "crm_external_bot_proposals_scope_fk"),
    foreignKey({
      columns: [
        table.tenantId,
        table.storeId,
        table.commandId,
        table.actionType,
      ],
      foreignColumns: [
        crmExternalBotActionCommands.tenantId,
        crmExternalBotActionCommands.storeId,
        crmExternalBotActionCommands.id,
        crmExternalBotActionCommands.actionType,
      ],
      name: "crm_external_bot_proposals_semantic_command_fk",
    }),
    revisionCheck(
      table.revision,
      "crm_external_bot_proposals_revision_nonnegative",
    ),
    check(
      "crm_external_bot_proposals_decision_state_check",
      sql`${table.decisionState} IN ('pending','approved','rejected')`,
    ),
    check(
      "crm_external_bot_proposals_decision_actor_check",
      sql`(${table.decisionState} = 'pending' AND ${table.decidedAt} IS NULL AND ${table.decidedByUserId} IS NULL) OR (${table.decisionState} IN ('approved','rejected') AND ${table.decidedAt} IS NOT NULL AND ${table.decidedByUserId} IS NOT NULL)`,
    ),
    uniqueIndex("crm_external_bot_proposals_idempotency_unique").on(
      table.tenantId,
      table.storeId,
      table.idempotencyKey,
    ),
  ],
);

export const crmExternalBotPolicies = pgTable(
  "crm_external_bot_policies",
  {
    ...lifecycleColumns,
    actionType: varchar("action_type", { length: 120 }).notNull(),
    channel: messagingChannel("channel").notNull(),
    connectionRatePerMinute: integer("connection_rate_per_minute")
      .notNull()
      .default(30),
    cooldownSeconds: integer("cooldown_seconds").notNull().default(30),
    dailyLimit: integer("daily_limit").notNull().default(500),
    mode: varchar("mode", { length: 16 }).notNull().default("disabled"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "crm_external_bot_policies_scope_fk"),
    check(
      "crm_external_bot_policies_mode_check",
      sql`${table.mode} IN ('auto','proposal','disabled')`,
    ),
    check(
      "crm_external_bot_policies_limits_check",
      sql`${table.cooldownSeconds} >= 0 AND ${table.connectionRatePerMinute} >= 0 AND ${table.dailyLimit} >= 0`,
    ),
    uniqueIndex("crm_external_bot_policies_action_unique").on(
      table.tenantId,
      table.storeId,
      table.channel,
      table.actionType,
    ),
    index("crm_external_bot_policies_channel_idx").on(
      table.tenantId,
      table.storeId,
      table.channel,
    ),
  ],
);
