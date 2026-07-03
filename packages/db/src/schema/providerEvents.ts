import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { stores, tenants } from "./identity.js";
import { lifecycleColumns } from "./_shared.js";

export const providerEventStatus = pgEnum("provider_event_status", [
  "received",
  "processed",
  "failed",
  "ignored",
]);

export const providerEvents = pgTable(
  "provider_events",
  {
    ...lifecycleColumns,
    connectionId: uuid("connection_id"),
    environment: varchar("environment", { length: 80 }).notNull(),
    errorMessage: text("error_message"),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerEventId: varchar("provider_event_id", { length: 191 }).notNull(),
    status: providerEventStatus("status").notNull().default("received"),
    storeId: uuid("store_id").references(() => stores.id),
    tenantId: uuid("tenant_id").references(() => tenants.id),
  },
  (table) => [
    index("provider_events_status_idx").on(table.status),
    index("provider_events_connection_id_idx").on(table.connectionId),
    index("provider_events_store_id_idx").on(table.storeId),
    index("provider_events_tenant_id_idx").on(table.tenantId),
    uniqueIndex("provider_events_provider_event_unique").on(
      table.provider,
      table.environment,
      table.providerEventId,
    ),
  ],
);
