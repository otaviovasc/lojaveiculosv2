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
import { crmChannelConnections } from "./crmCore/authorization.js";
import { messagingChannel } from "./crmCore/enums.js";
import { stores, tenants } from "./identity.js";

export const crmExternalBotRouteMode = pgEnum("crm_external_bot_route_mode", [
  "disabled",
  "inherit_store_default",
  "explicit_connection",
]);

export const crmChannelRoutingPolicies = pgTable(
  "crm_channel_routing_policies",
  {
    ...lifecycleColumns,
    externalBotConnectionId: uuid("external_bot_connection_id"),
    externalBotMode: crmExternalBotRouteMode("external_bot_mode")
      .notNull()
      .default("disabled"),
    channel: messagingChannel("channel").notNull(),
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
        crmChannelConnections.tenantId,
        crmChannelConnections.storeId,
        crmChannelConnections.id,
      ],
      name: "crm_channel_routing_policies_default_connection_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.externalBotConnectionId],
      foreignColumns: [
        crmChannelConnections.tenantId,
        crmChannelConnections.storeId,
        crmChannelConnections.id,
      ],
      name: "crm_channel_routing_policies_external_bot_connection_fk",
    }),
    check(
      "crm_channel_routing_policies_external_bot_mode_consistent",
      sql`(${table.externalBotMode} = 'explicit_connection' and ${table.externalBotConnectionId} is not null) or (${table.externalBotMode} <> 'explicit_connection' and ${table.externalBotConnectionId} is null)`,
    ),
    uniqueIndex("crm_channel_routing_policies_scope_channel_unique").on(
      table.tenantId,
      table.storeId,
      table.channel,
    ),
    index("crm_channel_routing_policies_default_connection_idx").on(
      table.defaultConnectionId,
    ),
    index("crm_channel_routing_policies_external_bot_connection_idx").on(
      table.externalBotConnectionId,
    ),
  ],
);
