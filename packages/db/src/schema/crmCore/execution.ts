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
import { providerConnections } from "./authorization.js";
import { conversationThreads } from "./conversations.js";
import {
  botActionCommandState,
  botAuthorizationClass,
  botGrantState,
  transportProvider,
  workflowProvider,
} from "./enums.js";
import { revisionCheck, revisionColumn } from "./revision.js";
import { scopedStoreForeignKey } from "./scoped.js";

export const botIntegrationGrants = pgTable(
  "bot_integration_grants",
  {
    ...lifecycleColumns,
    actionClass: botAuthorizationClass("action_class").notNull(),
    actionType: varchar("action_type", { length: 120 }).notNull(),
    botKey: varchar("bot_key", { length: 120 }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    grantedByUserId: uuid("granted_by_user_id").references(() => users.id),
    integrationId: uuid("integration_id").notNull(),
    modelVersion: varchar("model_version", { length: 120 }).notNull(),
    providerConnectionId: uuid("provider_connection_id")
      .notNull()
      .references(() => providerConnections.id),
    provider: transportProvider("provider").notNull(),
    requestDigest: varchar("request_digest", { length: 128 }).notNull(),
    tokenDigest: varchar("token_digest", { length: 128 }),
    authorizedRequestDigest: varchar("authorized_request_digest", {
      length: 128,
    }),
    revision: revisionColumn(),
    state: botGrantState("state").notNull().default("issued"),
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
    scopedStoreForeignKey(table, "bot_integration_grants_store_tenant_fk"),
    foreignKey({
      columns: [
        table.tenantId,
        table.storeId,
        table.providerConnectionId,
        table.provider,
      ],
      foreignColumns: [
        providerConnections.tenantId,
        providerConnections.storeId,
        providerConnections.id,
        providerConnections.provider,
      ],
      name: "bot_integration_grants_semantic_connection_fk",
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
      name: "bot_integration_grants_semantic_thread_fk",
    }),
    check(
      "bot_integration_grants_expiry_check",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      "bot_integration_grants_consumption_check",
      sql`(${table.state} = 'consumed') = (${table.consumedAt} IS NOT NULL)`,
    ),
    revisionCheck(
      table.revision,
      "bot_integration_grants_revision_nonnegative",
    ),
    uniqueIndex("bot_integration_grants_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("bot_integration_grants_command_scope_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
      table.providerConnectionId,
      table.threadId,
      table.provider,
      table.actionType,
      table.actionClass,
    ),
    uniqueIndex("bot_integration_grants_request_digest_unique").on(
      table.tenantId,
      table.storeId,
      table.requestDigest,
    ),
    uniqueIndex("bot_integration_grants_token_digest_unique")
      .on(table.tokenDigest)
      .where(sql`${table.tokenDigest} IS NOT NULL`),
    index("bot_integration_grants_expiry_idx").on(table.state, table.expiresAt),
  ],
);

export const botActionCommands = pgTable(
  "bot_action_commands",
  {
    ...lifecycleColumns,
    actionType: varchar("action_type", { length: 120 }).notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
    expectedRevision: integer("expected_revision").notNull(),
    grantId: uuid("grant_id")
      .notNull()
      .references(() => botIntegrationGrants.id),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    input: jsonb("input").notNull().default({}),
    provider: transportProvider("provider").notNull(),
    providerConnectionId: uuid("provider_connection_id")
      .notNull()
      .references(() => providerConnections.id),
    requestDigest: varchar("request_digest", { length: 128 }).notNull(),
    revision: revisionColumn(),
    authorizationClass: botAuthorizationClass("authorization_class").notNull(),
    state: botActionCommandState("state").notNull().default("accepted"),
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
    scopedStoreForeignKey(table, "bot_action_commands_store_tenant_fk"),
    foreignKey({
      columns: [
        table.tenantId,
        table.storeId,
        table.grantId,
        table.providerConnectionId,
        table.threadId,
        table.provider,
        table.actionType,
        table.authorizationClass,
      ],
      foreignColumns: [
        botIntegrationGrants.tenantId,
        botIntegrationGrants.storeId,
        botIntegrationGrants.id,
        botIntegrationGrants.providerConnectionId,
        botIntegrationGrants.threadId,
        botIntegrationGrants.provider,
        botIntegrationGrants.actionType,
        botIntegrationGrants.actionClass,
      ],
      name: "bot_action_commands_semantic_grant_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.providerConnectionId],
      foreignColumns: [
        providerConnections.tenantId,
        providerConnections.storeId,
        providerConnections.id,
      ],
      name: "bot_action_commands_scoped_connection_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.threadId],
      foreignColumns: [
        conversationThreads.tenantId,
        conversationThreads.storeId,
        conversationThreads.id,
      ],
      name: "bot_action_commands_scoped_thread_fk",
    }),
    check(
      "bot_action_commands_expected_revision_nonnegative",
      sql`${table.expectedRevision} >= 0`,
    ),
    check(
      "bot_action_commands_request_digest_nonempty",
      sql`btrim(${table.requestDigest}) <> ''`,
    ),
    check(
      "bot_action_commands_approval_check",
      sql`(${table.authorizationClass} IN ('automatic', 'proposal_only') AND ${table.approvedAt} IS NULL AND ${table.approvedByUserId} IS NULL) OR (${table.authorizationClass} = 'human_approved' AND ${table.approvedAt} IS NOT NULL AND ${table.approvedByUserId} IS NOT NULL)`,
    ),
    revisionCheck(table.revision, "bot_action_commands_revision_nonnegative"),
    uniqueIndex("bot_action_commands_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("bot_action_commands_effect_scope_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
      table.providerConnectionId,
      table.provider,
    ),
    uniqueIndex("bot_action_commands_proposal_scope_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
      table.actionType,
    ),
    uniqueIndex("bot_action_commands_idempotency_unique").on(
      table.tenantId,
      table.storeId,
      table.idempotencyKey,
    ),
    index("bot_action_commands_processing_idx").on(
      table.state,
      table.createdAt,
    ),
  ],
);
