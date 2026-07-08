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
import { lifecycleColumns } from "./_shared.js";
import { subscriptions } from "./billing.js";
import { stores, tenants } from "./identity.js";

export const billingCheckoutStatus = pgEnum("billing_checkout_status", [
  "created",
  "paid",
  "cancelled",
  "expired",
]);

export const billingCheckoutSessions = pgTable(
  "billing_checkout_sessions",
  {
    ...lifecycleColumns,
    callbackUrls: jsonb("callback_urls").notNull().default({}),
    checkoutUrl: text("checkout_url").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    externalReference: varchar("external_reference", { length: 200 }).notNull(),
    provider: varchar("provider", { length: 80 }).notNull().default("asaas"),
    providerCheckoutId: varchar("provider_checkout_id", {
      length: 191,
    }).notNull(),
    raw: jsonb("raw").notNull().default({}),
    status: billingCheckoutStatus("status").notNull().default("created"),
    storeId: uuid("store_id").references(() => stores.id),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("billing_checkout_sessions_tenant_status_idx").on(
      table.tenantId,
      table.status,
    ),
    uniqueIndex("billing_checkout_sessions_provider_checkout_unique").on(
      table.provider,
      table.providerCheckoutId,
    ),
  ],
);
