import {
  boolean,
  check,
  foreignKey,
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
import { sql } from "drizzle-orm";
import { stores, tenants } from "./identity.js";
import { lifecycleColumns } from "./_shared.js";

const includeBillingScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

export const catalogStatus = pgEnum("billing_catalog_status", [
  "active",
  "inactive",
  "archived",
]);

export const billingCatalogVersionStatus = pgEnum(
  "billing_catalog_version_status",
  ["staged", "active", "superseded"],
);

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

export const billingAddonContractStatus = pgEnum(
  "billing_addon_contract_status",
  ["pending", "scheduled", "paid_awaiting_setup", "active", "cancelled"],
);

export const billingProviderReconciliationKind = pgEnum(
  "billing_provider_reconciliation_kind",
  [
    "catalog_migration",
    "free_fallback",
    "zapi_cancellation",
    "zapi_retirement",
  ],
);

export const billingProviderReconciliationStatus = pgEnum(
  "billing_provider_reconciliation_status",
  ["queued", "processing", "retry", "succeeded"],
);

export const billingPlanHireStatus = pgEnum("billing_plan_hire_status", [
  "created",
  "checkout_created",
  "payment_pending",
  "activation_pending",
  "paid_active",
  "downgrade_scheduled",
  "cancelled",
  "expired",
  "failed",
  "reconciliation_failed",
]);

export const billingPlanHireCheckoutMode = pgEnum(
  "billing_plan_hire_checkout_mode",
  ["free", "checkout", "quote_required"],
);

export const billingPlanQuoteStatus = pgEnum("billing_plan_quote_status", [
  "requested",
  "approved",
  "rejected",
  "expired",
  "used",
]);

export const billingPackagingCutoverStatus = pgEnum(
  "billing_packaging_cutover_status",
  ["running", "completed", "failed"],
);

export const billingCatalogVersions = pgTable(
  "billing_catalog_versions",
  {
    ...lifecycleColumns,
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    activationAuditClaimedAt: timestamp("activation_audit_claimed_at", {
      withTimezone: true,
    }),
    activationAuditClaimToken: varchar("activation_audit_claim_token", {
      length: 191,
    }),
    activationAuditRecordedAt: timestamp("activation_audit_recorded_at", {
      withTimezone: true,
    }),
    checksum: varchar("checksum", { length: 64 }).notNull(),
    definition: jsonb("definition").notNull(),
    previousVersion: varchar("previous_version", { length: 80 }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    status: billingCatalogVersionStatus("status").notNull().default("staged"),
    version: varchar("version", { length: 80 }).notNull(),
  },
  (table) => [
    uniqueIndex("billing_catalog_versions_version_unique").on(table.version),
    uniqueIndex("billing_catalog_versions_single_active_unique")
      .on(table.status)
      .where(sql`${table.status} = 'active'`),
  ],
);

export const billingPackagingCutovers = pgTable(
  "billing_packaging_cutovers",
  {
    ...lifecycleColumns,
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failureCode: varchar("failure_code", { length: 120 }),
    status: billingPackagingCutoverStatus("status")
      .notNull()
      .default("running"),
    version: varchar("version", { length: 80 }).notNull(),
  },
  (table) => [
    uniqueIndex("billing_packaging_cutovers_version_unique").on(table.version),
  ],
);

export const plans = pgTable(
  "plans",
  {
    ...lifecycleColumns,
    catalogVersion: varchar("catalog_version", { length: 80 })
      .notNull()
      .default("2026-08-v1"),
    code: varchar("code", { length: 80 }).notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    limits: jsonb("limits").notNull().default({}),
    monthlyPriceCents: integer("monthly_price_cents").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: catalogStatus("status").notNull().default("active"),
  },
  (table) => [
    index("plans_status_published_idx").on(table.status, table.publishedAt),
    uniqueIndex("plans_code_catalog_version_unique").on(
      table.code,
      table.catalogVersion,
    ),
  ],
);

export const planFeatures = pgTable(
  "plan_features",
  {
    ...lifecycleColumns,
    featureKey: varchar("feature_key", { length: 80 }).notNull(),
    included: integer("included").notNull().default(1),
    includedInTrial: boolean("included_in_trial").notNull().default(false),
    limitValue: integer("limit_value"),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    trialLimitValue: integer("trial_limit_value"),
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
    catalogVersion: varchar("catalog_version", { length: 80 })
      .notNull()
      .default("2026-08-v1"),
    code: varchar("code", { length: 80 }).notNull(),
    featureKey: varchar("feature_key", { length: 80 }).notNull(),
    includedInTrial: boolean("included_in_trial").notNull().default(false),
    limits: jsonb("limits").notNull().default({}),
    monthlyPriceCents: integer("monthly_price_cents").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: catalogStatus("status").notNull().default("active"),
  },
  (table) => [
    index("addons_status_published_idx").on(table.status, table.publishedAt),
    uniqueIndex("addons_code_catalog_version_unique").on(
      table.code,
      table.catalogVersion,
    ),
  ],
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
    }),
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
    uniqueIndex("billing_customers_id_tenant_unique").on(
      table.id,
      table.tenantId,
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
    providerLifecycleEventId: varchar("provider_lifecycle_event_id", {
      length: 191,
    }),
    providerLifecycleObservedAt: timestamp("provider_lifecycle_observed_at", {
      withTimezone: true,
    }),
    status: subscriptionStatus("status").notNull().default("active"),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    ...(includeBillingScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.billingCustomerId, table.tenantId],
            foreignColumns: [billingCustomers.id, billingCustomers.tenantId],
            name: "subscriptions_customer_tenant_fk",
          }),
        ]
      : []),
    index("subscriptions_tenant_status_idx").on(table.tenantId, table.status),
    uniqueIndex("subscriptions_id_tenant_unique").on(table.id, table.tenantId),
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
    ...(includeBillingScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.storeId, table.tenantId],
            foreignColumns: [stores.id, stores.tenantId],
            name: "subscription_items_store_tenant_fk",
          }),
          foreignKey({
            columns: [table.subscriptionId, table.tenantId],
            foreignColumns: [subscriptions.id, subscriptions.tenantId],
            name: "subscription_items_subscription_tenant_fk",
          }),
        ]
      : []),
    check(
      "subscription_items_type_shape_check",
      sql`(${table.itemType} = 'plan' AND ${table.planId} IS NOT NULL AND ${table.addonId} IS NULL) OR (${table.itemType} = 'addon' AND ${table.addonId} IS NOT NULL AND ${table.planId} IS NULL)`,
    ),
    check(
      "subscription_items_effective_window_check",
      sql`${table.endsAt} IS NULL OR ${table.startsAt} IS NULL OR ${table.endsAt} > ${table.startsAt}`,
    ),
    index("subscription_items_store_id_idx").on(table.storeId),
    index("subscription_items_subscription_id_idx").on(table.subscriptionId),
    uniqueIndex("subscription_items_scoped_identity_unique").on(
      table.id,
      table.subscriptionId,
      table.tenantId,
      table.storeId,
    ),
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
    uniqueIndex("payments_scoped_identity_unique").on(
      table.id,
      table.subscriptionId,
      table.tenantId,
    ),
  ],
);

export const billingPlanQuotes = pgTable(
  "billing_plan_quotes",
  {
    ...lifecycleColumns,
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedByActorId: varchar("approved_by_actor_id", { length: 191 }),
    catalogVersion: varchar("catalog_version", { length: 80 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    quotedCents: integer("quoted_cents"),
    requestedByActorId: varchar("requested_by_actor_id", {
      length: 191,
    }).notNull(),
    status: billingPlanQuoteStatus("status").notNull().default("requested"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    ...(includeBillingScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.storeId, table.tenantId],
            foreignColumns: [stores.id, stores.tenantId],
            name: "billing_plan_quotes_store_tenant_fk",
          }),
        ]
      : []),
    check(
      "billing_plan_quotes_approved_price_check",
      sql`${table.status} <> 'approved' OR ${table.quotedCents} IS NOT NULL`,
    ),
    index("billing_plan_quotes_store_status_idx").on(
      table.storeId,
      table.status,
      table.createdAt,
    ),
    uniqueIndex("billing_plan_quotes_scoped_identity_unique").on(
      table.id,
      table.tenantId,
      table.storeId,
    ),
  ],
);

export const billingPlanHires = pgTable(
  "billing_plan_hires",
  {
    ...lifecycleColumns,
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    catalogVersion: varchar("catalog_version", { length: 80 }).notNull(),
    checkoutMode: billingPlanHireCheckoutMode("checkout_mode").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    effectiveAt: timestamp("effective_at", { withTimezone: true }),
    effectiveSubscriptionItemId: uuid("effective_subscription_item_id"),
    failureCode: varchar("failure_code", { length: 120 }),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    planSnapshot: jsonb("plan_snapshot").notNull(),
    provider: varchar("provider", { length: 80 }).notNull().default("asaas"),
    providerCheckoutId: varchar("provider_checkout_id", { length: 191 }),
    providerPaymentId: varchar("provider_payment_id", { length: 191 }),
    providerSubscriptionId: varchar("provider_subscription_id", {
      length: 191,
    }),
    quotedCents: integer("quoted_cents").notNull(),
    quoteId: uuid("quote_id").references(() => billingPlanQuotes.id),
    status: billingPlanHireStatus("status").notNull().default("created"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    ...(includeBillingScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.storeId, table.tenantId],
            foreignColumns: [stores.id, stores.tenantId],
            name: "billing_plan_hires_store_tenant_fk",
          }),
          foreignKey({
            columns: [table.subscriptionId, table.tenantId],
            foreignColumns: [subscriptions.id, subscriptions.tenantId],
            name: "billing_plan_hires_subscription_tenant_fk",
          }),
          foreignKey({
            columns: [
              table.effectiveSubscriptionItemId,
              table.subscriptionId,
              table.tenantId,
              table.storeId,
            ],
            foreignColumns: [
              subscriptionItems.id,
              subscriptionItems.subscriptionId,
              subscriptionItems.tenantId,
              subscriptionItems.storeId,
            ],
            name: "billing_plan_hires_effective_item_scope_fk",
          }),
          foreignKey({
            columns: [table.quoteId, table.tenantId, table.storeId],
            foreignColumns: [
              billingPlanQuotes.id,
              billingPlanQuotes.tenantId,
              billingPlanQuotes.storeId,
            ],
            name: "billing_plan_hires_quote_scope_fk",
          }),
        ]
      : []),
    check(
      "billing_plan_hires_quote_mode_check",
      sql`(${table.checkoutMode} = 'quote_required' AND ${table.quoteId} IS NOT NULL) OR ${table.checkoutMode} <> 'quote_required'`,
    ),
    check(
      "billing_plan_hires_non_negative_quote_check",
      sql`${table.quotedCents} >= 0`,
    ),
    index("billing_plan_hires_store_status_idx").on(
      table.storeId,
      table.status,
      table.createdAt,
    ),
    index("billing_plan_hires_external_reference_idx").on(table.id),
    uniqueIndex("billing_plan_hires_store_idempotency_unique").on(
      table.tenantId,
      table.storeId,
      table.idempotencyKey,
    ),
    uniqueIndex("billing_plan_hires_one_open_store_unique")
      .on(table.tenantId, table.storeId)
      .where(
        sql`${table.status} IN ('created', 'checkout_created', 'payment_pending', 'activation_pending')`,
      ),
    uniqueIndex("billing_plan_hires_provider_checkout_unique")
      .on(table.provider, table.providerCheckoutId)
      .where(sql`${table.providerCheckoutId} IS NOT NULL`),
    uniqueIndex("billing_plan_hires_provider_payment_unique")
      .on(table.provider, table.providerPaymentId)
      .where(sql`${table.providerPaymentId} IS NOT NULL`),
    uniqueIndex("billing_plan_hires_scoped_identity_unique").on(
      table.id,
      table.tenantId,
      table.storeId,
    ),
  ],
);

export const billingPlanHireTransitions = pgTable(
  "billing_plan_hire_transitions",
  {
    ...lifecycleColumns,
    failureCode: varchar("failure_code", { length: 120 }),
    fromStatus: billingPlanHireStatus("from_status"),
    hireId: uuid("hire_id")
      .notNull()
      .references(() => billingPlanHires.id),
    metadata: jsonb("metadata").notNull().default({}),
    providerEventId: varchar("provider_event_id", { length: 191 }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    toStatus: billingPlanHireStatus("to_status").notNull(),
  },
  (table) => [
    ...(includeBillingScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.hireId, table.tenantId, table.storeId],
            foreignColumns: [
              billingPlanHires.id,
              billingPlanHires.tenantId,
              billingPlanHires.storeId,
            ],
            name: "billing_plan_hire_transitions_hire_scope_fk",
          }),
        ]
      : []),
    index("billing_plan_hire_transitions_hire_created_idx").on(
      table.hireId,
      table.createdAt,
    ),
  ],
);

export const billingProviderReconciliations = pgTable(
  "billing_provider_reconciliations",
  {
    ...lifecycleColumns,
    attemptCount: integer("attempt_count").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    kind: billingProviderReconciliationKind("kind").notNull(),
    lastError: text("last_error"),
    processingStartedAt: timestamp("processing_started_at", {
      withTimezone: true,
    }),
    processingToken: uuid("processing_token"),
    status: billingProviderReconciliationStatus("status")
      .notNull()
      .default("queued"),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    ...(includeBillingScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.subscriptionId, table.tenantId],
            foreignColumns: [subscriptions.id, subscriptions.tenantId],
            name: "billing_provider_reconciliations_subscription_tenant_fk",
          }),
        ]
      : []),
    index("billing_provider_reconciliations_claim_idx").on(
      table.status,
      table.availableAt,
      table.processingStartedAt,
    ),
    uniqueIndex("billing_provider_reconciliations_kind_subscription_unique").on(
      table.kind,
      table.subscriptionId,
    ),
  ],
);

export const billingAddonContracts = pgTable(
  "billing_addon_contracts",
  {
    ...lifecycleColumns,
    addonId: uuid("addon_id")
      .notNull()
      .references(() => addons.id),
    activatedByPaymentId: uuid("activated_by_payment_id"),
    activatedByProviderCheckoutId: varchar(
      "activated_by_provider_checkout_id",
      { length: 191 },
    ),
    activatedByProviderEventId: varchar("activated_by_provider_event_id", {
      length: 191,
    }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationScheduledFor: timestamp("cancellation_scheduled_for", {
      withTimezone: true,
    }),
    cancellationSyncPending: boolean("cancellation_sync_pending")
      .notNull()
      .default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    expectedRenewalAmountCents: integer("expected_renewal_amount_cents"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    setupCompletedAt: timestamp("setup_completed_at", { withTimezone: true }),
    setupConnectionId: uuid("setup_connection_id"),
    status: billingAddonContractStatus("status").notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id),
    subscriptionItemId: uuid("subscription_item_id")
      .notNull()
      .references(() => subscriptionItems.id),
    supportCode: varchar("support_code", { length: 32 })
      .notNull()
      .default(
        sql`'ZAPI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))`,
      ),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    ...(includeBillingScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.storeId, table.tenantId],
            foreignColumns: [stores.id, stores.tenantId],
            name: "billing_addon_contracts_store_tenant_fk",
          }),
          foreignKey({
            columns: [table.subscriptionId, table.tenantId],
            foreignColumns: [subscriptions.id, subscriptions.tenantId],
            name: "billing_addon_contracts_subscription_tenant_fk",
          }),
          foreignKey({
            columns: [
              table.subscriptionItemId,
              table.subscriptionId,
              table.tenantId,
              table.storeId,
            ],
            foreignColumns: [
              subscriptionItems.id,
              subscriptionItems.subscriptionId,
              subscriptionItems.tenantId,
              subscriptionItems.storeId,
            ],
            name: "billing_addon_contracts_item_scope_fk",
          }),
          foreignKey({
            columns: [
              table.activatedByPaymentId,
              table.subscriptionId,
              table.tenantId,
            ],
            foreignColumns: [
              payments.id,
              payments.subscriptionId,
              payments.tenantId,
            ],
            name: "billing_addon_contracts_payment_scope_fk",
          }),
        ]
      : []),
    index("billing_addon_contracts_subscription_status_idx").on(
      table.subscriptionId,
      table.status,
      table.scheduledFor,
    ),
    index("billing_addon_contracts_store_status_idx").on(
      table.storeId,
      table.status,
    ),
    uniqueIndex("billing_addon_contracts_item_unique").on(
      table.subscriptionItemId,
    ),
    uniqueIndex("billing_addon_contracts_open_store_addon_unique")
      .on(table.storeId, table.addonId)
      .where(sql`${table.status} <> 'cancelled'`),
    uniqueIndex("billing_addon_contracts_support_code_unique").on(
      table.supportCode,
    ),
  ],
);
