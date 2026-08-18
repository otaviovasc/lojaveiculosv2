import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "../_shared.js";
import { stores, tenants } from "../identity.js";
import {
  authorizationState,
  capabilityGrantState,
  credentialBroker,
  integrationCapability,
  messagingChannel,
  crmChannelConnectionState,
  scopeGrantState,
  transportProvider,
} from "./enums.js";
import { scopedStoreForeignKey } from "./scoped.js";
import { revisionCheck, revisionColumn } from "./revision.js";

export const externalAccountAuthorizations = pgTable(
  "external_account_authorizations",
  {
    ...lifecycleColumns,
    authorizationState: authorizationState("authorization_state")
      .notNull()
      .default("pending"),
    broker: credentialBroker("broker").notNull(),
    externalAccountId: varchar("external_account_id", { length: 191 }),
    grantedScopes: text("granted_scopes").array().notNull().default([]),
    metadata: jsonb("metadata").notNull().default({}),
    provider: transportProvider("provider").notNull(),
    requestedScopes: text("requested_scopes").array().notNull().default([]),
    revision: revisionColumn(),
    scopeState: scopeGrantState("scope_state").notNull().default("pending"),
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
      "external_account_authorizations_store_tenant_fk",
    ),
    revisionCheck(
      table.revision,
      "external_account_authorizations_revision_nonnegative",
    ),
    uniqueIndex("external_account_authorizations_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("external_account_authorizations_semantic_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
      table.provider,
      table.broker,
    ),
    uniqueIndex("external_account_authorizations_external_unique")
      .on(
        table.tenantId,
        table.storeId,
        table.provider,
        table.broker,
        table.externalAccountId,
      )
      .where(sql`${table.externalAccountId} IS NOT NULL`),
  ],
);

export const externalAccountAuthorizationCapabilities = pgTable(
  "external_account_authorization_capabilities",
  {
    ...lifecycleColumns,
    authorizationId: uuid("authorization_id")
      .notNull()
      .references(() => externalAccountAuthorizations.id),
    capability: integrationCapability("capability").notNull(),
    revision: revisionColumn(),
    state: capabilityGrantState("state").notNull().default("pending"),
    stateReason: varchar("state_reason", { length: 191 }),
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
      "external_authorization_capabilities_store_tenant_fk",
    ),
    revisionCheck(
      table.revision,
      "external_authorization_capabilities_revision_nonnegative",
    ),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.authorizationId],
      foreignColumns: [
        externalAccountAuthorizations.tenantId,
        externalAccountAuthorizations.storeId,
        externalAccountAuthorizations.id,
      ],
      name: "external_authorization_capabilities_scoped_authorization_fk",
    }),
    uniqueIndex("external_authorization_capabilities_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("external_authorization_capabilities_grant_unique").on(
      table.authorizationId,
      table.capability,
    ),
  ],
);

export const crmChannelConnections = pgTable(
  "crm_channel_connections",
  {
    ...lifecycleColumns,
    authorizationId: uuid("authorization_id"),
    broker: credentialBroker("broker").notNull(),
    channel: messagingChannel("channel").notNull(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    externalConnectionId: varchar("external_connection_id", { length: 191 }),
    externalInstanceId: varchar("external_instance_id", { length: 191 }),
    metadata: jsonb("metadata").notNull().default({}),
    provider: transportProvider("provider").notNull(),
    revision: revisionColumn(),
    state: crmChannelConnectionState("state").notNull().default("sandbox"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    webhookUrl: varchar("webhook_url", { length: 500 }),
  },
  (table) => [
    scopedStoreForeignKey(table, "crm_channel_connections_store_tenant_fk"),
    revisionCheck(
      table.revision,
      "crm_channel_connections_revision_nonnegative",
    ),
    check(
      "crm_channel_connections_supported_triple_check",
      sql`(${table.channel} = 'whatsapp' AND ${table.provider} = 'meta_cloud' AND ${table.broker} = 'composio') OR (${table.channel} = 'instagram' AND ${table.provider} = 'meta_cloud' AND ${table.broker} = 'composio') OR (${table.channel} = 'whatsapp' AND ${table.provider} = 'zapi' AND ${table.broker} = 'direct') OR (${table.channel} = 'olx_chat' AND ${table.provider} = 'olx' AND ${table.broker} = 'direct')`,
    ),
    foreignKey({
      columns: [
        table.tenantId,
        table.storeId,
        table.authorizationId,
        table.provider,
        table.broker,
      ],
      foreignColumns: [
        externalAccountAuthorizations.tenantId,
        externalAccountAuthorizations.storeId,
        externalAccountAuthorizations.id,
        externalAccountAuthorizations.provider,
        externalAccountAuthorizations.broker,
      ],
      name: "crm_channel_connections_semantic_authorization_fk",
    }),
    uniqueIndex("crm_channel_connections_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("crm_channel_connections_provider_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
      table.provider,
    ),
    uniqueIndex("crm_channel_connections_channel_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
      table.channel,
    ),
    uniqueIndex("crm_channel_connections_external_unique")
      .on(
        table.tenantId,
        table.storeId,
        table.provider,
        table.externalConnectionId,
      )
      .where(sql`${table.externalConnectionId} IS NOT NULL`),
    index("crm_channel_connections_store_state_idx").on(
      table.storeId,
      table.state,
    ),
  ],
);
