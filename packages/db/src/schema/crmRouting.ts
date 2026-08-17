import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { providerConnections } from "./crmCore/authorization.js";
import { stores, tenants } from "./identity.js";

export const crmRoutingChannel = pgEnum("crm_routing_channel", [
  "whatsapp",
  "instagram",
  "olx_chat",
]);

export const crmBotRoutingMode = pgEnum("crm_bot_routing_mode", [
  "disabled",
  "inherit_store_default",
  "explicit_connection",
]);

export const crmChannelRoutingPolicies = pgTable(
  "crm_channel_routing_policies",
  {
    ...lifecycleColumns,
    botConnectionId: uuid("bot_connection_id"),
    botMode: crmBotRoutingMode("bot_mode").notNull().default("disabled"),
    channel: crmRoutingChannel("channel").notNull(),
    defaultConnectionId: uuid("default_connection_id"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId, table.tenantId],
      foreignColumns: [stores.id, stores.tenantId],
      name: "crm_channel_routing_policies_store_tenant_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.defaultConnectionId],
      foreignColumns: [
        providerConnections.tenantId,
        providerConnections.storeId,
        providerConnections.id,
      ],
      name: "crm_channel_routing_policies_default_connection_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.botConnectionId],
      foreignColumns: [
        providerConnections.tenantId,
        providerConnections.storeId,
        providerConnections.id,
      ],
      name: "crm_channel_routing_policies_bot_connection_fk",
    }),
    check(
      "crm_channel_routing_policies_bot_mode_consistent",
      sql`(${table.botMode} = 'explicit_connection' and ${table.botConnectionId} is not null) or (${table.botMode} <> 'explicit_connection' and ${table.botConnectionId} is null)`,
    ),
    uniqueIndex("crm_channel_routing_policies_scope_channel_unique").on(
      table.tenantId,
      table.storeId,
      table.channel,
    ),
    index("crm_channel_routing_policies_default_connection_idx").on(
      table.defaultConnectionId,
    ),
    index("crm_channel_routing_policies_bot_connection_idx").on(
      table.botConnectionId,
    ),
  ],
);
