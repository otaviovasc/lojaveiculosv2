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
import { stores, tenants, users } from "../identity.js";
import { crmChannelConnections } from "./authorization.js";
import { conversationThreads } from "./conversations.js";
import {
  crmExternalBotActionCommandState,
  crmExternalBotAuthorizationClass,
  crmExternalBotGrantState,
  transportProvider,
  workflowProvider,
} from "./enums.js";
import { revisionCheck, revisionColumn } from "./revision.js";
import { scopedStoreForeignKey } from "./scoped.js";

export const crmExternalBotGrants = pgTable(
  "crm_external_bot_grants",
  {
    ...lifecycleColumns,
    actionClass: crmExternalBotAuthorizationClass("action_class").notNull(),
    actionType: varchar("action_type", { length: 120 }).notNull(),
    botKey: varchar("bot_key", { length: 120 }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    grantedByUserId: uuid("granted_by_user_id").references(() => users.id),
    integrationId: uuid("integration_id").notNull(),
    modelVersion: varchar("model_version", { length: 120 }).notNull(),
    providerConnectionId: uuid("provider_connection_id")
      .notNull()
      .references(() => crmChannelConnections.id),
    provider: transportProvider("provider").notNull(),
    requestDigest: varchar("request_digest", { length: 128 }).notNull(),
    tokenDigest: varchar("token_digest", { length: 128 }),
    authorizedRequestDigest: varchar("authorized_request_digest", {
      length: 128,
    }),
    revision: revisionColumn(),
    state: crmExternalBotGrantState("state").notNull().default("issued"),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => conversationThreads.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    workflowProvider: workflowProvider("workflow_provider").notNull(),
  },
  (table) => [
    scopedStoreForeignKey(table, "crm_external_bot_grants_store_tenant_fk"),
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
      name: "crm_external_bot_grants_semantic_connection_fk",
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
      name: "crm_external_bot_grants_semantic_thread_fk",
    }),
    check(
      "crm_external_bot_grants_expiry_check",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      "crm_external_bot_grants_consumption_check",
      sql`(${table.state} = 'consumed') = (${table.consumedAt} IS NOT NULL)`,
    ),
    revisionCheck(
      table.revision,
      "crm_external_bot_grants_revision_nonnegative",
    ),
    uniqueIndex("crm_external_bot_grants_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("crm_external_bot_grants_command_scope_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
      table.providerConnectionId,
      table.threadId,
      table.provider,
      table.actionType,
      table.actionClass,
    ),
    uniqueIndex("crm_external_bot_grants_approval_scope_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
      table.providerConnectionId,
      table.threadId,
      table.provider,
      table.actionType,
    ),
    uniqueIndex("crm_external_bot_grants_request_digest_unique").on(
      table.tenantId,
      table.storeId,
      table.requestDigest,
    ),
    uniqueIndex("crm_external_bot_grants_token_digest_unique")
      .on(table.tokenDigest)
      .where(sql`${table.tokenDigest} IS NOT NULL`),
    index("crm_external_bot_grants_expiry_idx").on(
      table.state,
      table.expiresAt,
    ),
  ],
);

export const crmExternalBotActionCommands = pgTable(
  "crm_external_bot_action_commands",
  {
    ...lifecycleColumns,
    actionType: varchar("action_type", { length: 120 }).notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
    expectedAttendanceRevision: integer(
      "expected_attendance_revision",
    ).notNull(),
    expectedRevision: integer("expected_revision").notNull(),
    grantId: uuid("grant_id")
      .notNull()
      .references(() => crmExternalBotGrants.id),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    input: jsonb("input").notNull().default({}),
    provider: transportProvider("provider").notNull(),
    providerConnectionId: uuid("provider_connection_id")
      .notNull()
      .references(() => crmChannelConnections.id),
    requestDigest: varchar("request_digest", { length: 128 }).notNull(),
    revision: revisionColumn(),
    authorizationClass: crmExternalBotAuthorizationClass(
      "authorization_class",
    ).notNull(),
    state: crmExternalBotActionCommandState("state")
      .notNull()
      .default("accepted"),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => conversationThreads.id),
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
      "crm_external_bot_action_commands_store_tenant_fk",
    ),
    foreignKey({
      columns: [
        table.tenantId,
        table.storeId,
        table.grantId,
        table.providerConnectionId,
        table.threadId,
        table.provider,
        table.actionType,
      ],
      foreignColumns: [
        crmExternalBotGrants.tenantId,
        crmExternalBotGrants.storeId,
        crmExternalBotGrants.id,
        crmExternalBotGrants.providerConnectionId,
        crmExternalBotGrants.threadId,
        crmExternalBotGrants.provider,
        crmExternalBotGrants.actionType,
      ],
      name: "crm_external_bot_action_commands_semantic_grant_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.providerConnectionId],
      foreignColumns: [
        crmChannelConnections.tenantId,
        crmChannelConnections.storeId,
        crmChannelConnections.id,
      ],
      name: "crm_external_bot_action_commands_scoped_connection_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.threadId],
      foreignColumns: [
        conversationThreads.tenantId,
        conversationThreads.storeId,
        conversationThreads.id,
      ],
      name: "crm_external_bot_action_commands_scoped_thread_fk",
    }),
    check(
      "crm_external_bot_action_commands_expected_attendance_revision_nonnegative",
      sql`${table.expectedAttendanceRevision} >= 0`,
    ),
    check(
      "crm_external_bot_action_commands_expected_revision_nonnegative",
      sql`${table.expectedRevision} >= 0`,
    ),
    check(
      "crm_external_bot_action_commands_request_digest_nonempty",
      sql`btrim(${table.requestDigest}) <> ''`,
    ),
    check(
      "crm_external_bot_action_commands_approval_check",
      sql`(${table.authorizationClass} IN ('automatic', 'proposal_only') AND ${table.approvedAt} IS NULL AND ${table.approvedByUserId} IS NULL) OR (${table.authorizationClass} = 'human_approved' AND ${table.approvedAt} IS NOT NULL AND ${table.approvedByUserId} IS NOT NULL)`,
    ),
    revisionCheck(
      table.revision,
      "crm_external_bot_action_commands_revision_nonnegative",
    ),
    uniqueIndex("crm_external_bot_action_commands_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("crm_external_bot_action_commands_effect_scope_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
      table.providerConnectionId,
      table.provider,
    ),
    uniqueIndex("crm_external_bot_action_commands_proposal_scope_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
      table.actionType,
    ),
    uniqueIndex("crm_external_bot_action_commands_idempotency_unique").on(
      table.tenantId,
      table.storeId,
      table.idempotencyKey,
    ),
    index("crm_external_bot_action_commands_processing_idx").on(
      table.state,
      table.createdAt,
    ),
  ],
);
