import {
  index,
  integer,
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

export const catalogStatus = pgEnum("billing_catalog_status", [
  "active",
  "inactive",
  "archived",
]);

export const subscriptionStatus = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "cancelled",
  "expired",
]);

export const subscriptionItemType = pgEnum("subscription_item_type", [
  "plan",
  "addon",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "paid",
  "overdue",
  "refunded",
  "cancelled",
]);

export const plans = pgTable(
  "plans",
  {
    ...lifecycleColumns,
    code: varchar("code", { length: 80 }).notNull(),
    limits: jsonb("limits").notNull().default({}),
    monthlyPriceCents: integer("monthly_price_cents").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    status: catalogStatus("status").notNull().default("active"),
  },
  (table) => [uniqueIndex("plans_code_unique").on(table.code)],
);

export const planFeatures = pgTable(
  "plan_features",
  {
    ...lifecycleColumns,
    featureKey: varchar("feature_key", { length: 80 }).notNull(),
    included: integer("included").notNull().default(1),
    limitValue: integer("limit_value"),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
  },
  (table) => [
    uniqueIndex("plan_features_plan_feature_unique").on(
      table.planId,
      table.featureKey,
    ),
  ],
);

export const addons = pgTable(
  "addons",
  {
    ...lifecycleColumns,
    code: varchar("code", { length: 80 }).notNull(),
    featureKey: varchar("feature_key", { length: 80 }).notNull(),
    monthlyPriceCents: integer("monthly_price_cents").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    status: catalogStatus("status").notNull().default("active"),
  },
  (table) => [uniqueIndex("addons_code_unique").on(table.code)],
);

export const billingCustomers = pgTable(
  "billing_customers",
  {
    ...lifecycleColumns,
    documentNumber: varchar("document_number", { length: 32 }),
    email: varchar("email", { length: 254 }),
    name: varchar("name", { length: 191 }).notNull(),
    provider: varchar("provider", { length: 80 }).notNull().default("asaas"),
    providerCustomerId: varchar("provider_customer_id", {
      length: 191,
    }).notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    uniqueIndex("billing_customers_provider_customer_unique").on(
      table.provider,
      table.providerCustomerId,
    ),
    uniqueIndex("billing_customers_tenant_provider_unique").on(
      table.tenantId,
      table.provider,
    ),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    ...lifecycleColumns,
    billingCustomerId: uuid("billing_customer_id")
      .notNull()
      .references(() => billingCustomers.id),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    provider: varchar("provider", { length: 80 }).notNull().default("asaas"),
    providerSubscriptionId: varchar("provider_subscription_id", {
      length: 191,
    }),
    status: subscriptionStatus("status").notNull().default("trialing"),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("subscriptions_tenant_status_idx").on(table.tenantId, table.status),
    uniqueIndex("subscriptions_provider_subscription_unique").on(
      table.provider,
      table.providerSubscriptionId,
    ),
  ],
);

export const subscriptionItems = pgTable(
  "subscription_items",
  {
    ...lifecycleColumns,
    addonId: uuid("addon_id").references(() => addons.id),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    itemType: subscriptionItemType("item_type").notNull(),
    planId: uuid("plan_id").references(() => plans.id),
    quantity: integer("quantity").notNull().default(1),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    storeId: uuid("store_id").references(() => stores.id),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    unitAmountCents: integer("unit_amount_cents").notNull(),
  },
  (table) => [
    index("subscription_items_store_id_idx").on(table.storeId),
    index("subscription_items_subscription_id_idx").on(table.subscriptionId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    ...lifecycleColumns,
    amountCents: integer("amount_cents").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    externalReference: varchar("external_reference", { length: 191 }),
    invoiceUrl: text("invoice_url"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    provider: varchar("provider", { length: 80 }).notNull().default("asaas"),
    providerPaymentId: varchar("provider_payment_id", { length: 191 }),
    raw: jsonb("raw").notNull().default({}),
    status: paymentStatus("status").notNull().default("pending"),
    storeId: uuid("store_id").references(() => stores.id),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("payments_external_reference_idx").on(table.externalReference),
    index("payments_tenant_status_idx").on(table.tenantId, table.status),
    uniqueIndex("payments_provider_payment_unique").on(
      table.provider,
      table.providerPaymentId,
    ),
  ],
);
