import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "../_shared.js";
import { stores, tenants } from "../identity.js";
import { providerConnections } from "./authorization.js";
import { integrationEventState, transportProvider } from "./enums.js";
import { revisionCheck, revisionColumn } from "./revision.js";
import { scopedStoreForeignKey } from "./scoped.js";

export const integrationEvents = pgTable(
  "integration_events",
  {
    ...lifecycleColumns,
    errorCode: varchar("error_code", { length: 120 }),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    payload: jsonb("payload").notNull().default({}),
    provider: transportProvider("provider").notNull(),
    providerConnectionId: uuid("provider_connection_id").references(
      () => providerConnections.id,
    ),
    providerEventId: varchar("provider_event_id", { length: 191 }),
    revision: revisionColumn(),
    state: integrationEventState("state").notNull().default("received"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "integration_events_store_tenant_fk"),
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
      name: "integration_events_semantic_connection_fk",
    }),
    revisionCheck(table.revision, "integration_events_revision_nonnegative"),
    uniqueIndex("integration_events_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("integration_events_idempotency_unique").on(
      table.tenantId,
      table.storeId,
      table.provider,
      table.idempotencyKey,
    ),
    index("integration_events_processing_idx").on(table.state, table.createdAt),
  ],
);
