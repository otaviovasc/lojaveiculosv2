import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { stores, tenants } from "./identity.js";
import { lifecycleColumns } from "./_shared.js";

export const apiClientStatus = pgEnum("api_client_status", [
  "active",
  "revoked",
  "suspended",
]);

export const apiWebhookStatus = pgEnum("api_webhook_status", [
  "active",
  "paused",
  "revoked",
]);

export const apiClients = pgTable(
  "api_clients",
  {
    ...lifecycleColumns,
    name: varchar("name", { length: 120 }).notNull(),
    scopes: jsonb("scopes").notNull().default([]),
    status: apiClientStatus("status").notNull().default("active"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [index("api_clients_store_id_idx").on(table.storeId)],
);

export const apiClientKeys = pgTable(
  "api_client_keys",
  {
    ...lifecycleColumns,
    clientId: uuid("client_id")
      .notNull()
      .references(() => apiClients.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    keyHash: varchar("key_hash", { length: 191 }).notNull(),
    keyPrefix: varchar("key_prefix", { length: 32 }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("api_client_keys_client_id_idx").on(table.clientId),
    uniqueIndex("api_client_keys_hash_unique").on(table.keyHash),
  ],
);

export const apiRequestLogs = pgTable(
  "api_request_logs",
  {
    ...lifecycleColumns,
    clientId: uuid("client_id").references(() => apiClients.id),
    method: varchar("method", { length: 16 }).notNull(),
    path: varchar("path", { length: 500 }).notNull(),
    requestId: varchar("request_id", { length: 191 }).notNull(),
    responseMs: integer("response_ms"),
    statusCode: integer("status_code").notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("api_request_logs_client_id_idx").on(table.clientId),
    index("api_request_logs_store_created_idx").on(
      table.storeId,
      table.createdAt,
    ),
  ],
);

export const apiWebhooks = pgTable(
  "api_webhooks",
  {
    ...lifecycleColumns,
    clientId: uuid("client_id")
      .notNull()
      .references(() => apiClients.id),
    events: jsonb("events").notNull().default([]),
    status: apiWebhookStatus("status").notNull().default("active"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    targetUrl: varchar("target_url", { length: 500 }).notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [index("api_webhooks_client_id_idx").on(table.clientId)],
);

export const apiWebhookDeliveries = pgTable(
  "api_webhook_deliveries",
  {
    ...lifecycleColumns,
    attemptCount: integer("attempt_count").notNull().default(0),
    eventKey: varchar("event_key", { length: 191 }).notNull(),
    lastStatusCode: integer("last_status_code"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    payload: jsonb("payload").notNull().default({}),
    webhookId: uuid("webhook_id")
      .notNull()
      .references(() => apiWebhooks.id),
  },
  (table) => [
    index("api_webhook_deliveries_next_attempt_idx").on(table.nextAttemptAt),
    uniqueIndex("api_webhook_deliveries_event_unique").on(
      table.webhookId,
      table.eventKey,
    ),
  ],
);
