import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { financingCustomerConsents } from "./financingCustomerConsents.js";
import {
  financingProvider,
  financingProviderAccounts,
  financingProviderEnvironment,
} from "./financingProviders.js";
import { financingProviderStoreMappings } from "./financingProviderStores.js";
import { stores, tenants, users } from "./identity.js";
import { vehicleListings, vehicleUnits } from "./inventory.js";
import { leads } from "./leads.js";

const includeFinancingScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

export const financingInquiries = pgTable(
  "financing_inquiries",
  {
    ...lifecycleColumns,
    accountId: uuid("account_id"),
    applicantDocumentHash: varchar("applicant_document_hash", { length: 64 }),
    applicantDocumentLast4: varchar("applicant_document_last4", { length: 4 }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    consentId: uuid("consent_id"),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    idempotencyKey: varchar("idempotency_key", { length: 191 }),
    leadId: uuid("lead_id").references(() => leads.id),
    listingId: uuid("listing_id").references(() => vehicleListings.id),
    metadata: jsonb("metadata").notNull().default({}),
    operationRequestId: uuid("operation_request_id"),
    provider: financingProvider("provider").notNull(),
    providerEnvironment: financingProviderEnvironment("provider_environment")
      .notNull()
      .default("production"),
    providerInquiryId: varchar("provider_inquiry_id", { length: 191 }),
    providerOperationId: varchar("provider_operation_id", { length: 191 }),
    providerResultCode: varchar("provider_result_code", { length: 120 }),
    providerResultMessage: text("provider_result_message"),
    providerResultSummary: jsonb("provider_result_summary")
      .notNull()
      .default({}),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id),
    status: varchar("status", { length: 80 }).notNull().default("requested"),
    storeMappingId: uuid("store_mapping_id"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    unitId: uuid("unit_id").references(() => vehicleUnits.id),
  },
  (table) => [
    ...(includeFinancingScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.accountId, table.tenantId],
            foreignColumns: [
              financingProviderAccounts.id,
              financingProviderAccounts.tenantId,
            ],
            name: "financing_inquiries_account_scope_fk",
          }),
          foreignKey({
            columns: [
              table.storeMappingId,
              table.accountId,
              table.tenantId,
              table.storeId,
            ],
            foreignColumns: [
              financingProviderStoreMappings.id,
              financingProviderStoreMappings.accountId,
              financingProviderStoreMappings.tenantId,
              financingProviderStoreMappings.storeId,
            ],
            name: "financing_inquiries_mapping_scope_fk",
          }),
          foreignKey({
            columns: [table.consentId, table.tenantId, table.storeId],
            foreignColumns: [
              financingCustomerConsents.id,
              financingCustomerConsents.tenantId,
              financingCustomerConsents.storeId,
            ],
            name: "financing_inquiries_consent_scope_fk",
          }),
        ]
      : []),
    uniqueIndex("financing_inquiries_id_scope_unique").on(
      table.id,
      table.tenantId,
      table.storeId,
    ),
    index("financing_inquiries_account_status_idx").on(
      table.accountId,
      table.status,
    ),
    index("financing_inquiries_lead_id_idx").on(table.leadId),
    index("financing_inquiries_listing_id_idx").on(table.listingId),
    index("financing_inquiries_provider_operation_idx").on(
      table.provider,
      table.providerEnvironment,
      table.providerOperationId,
    ),
    index("financing_inquiries_store_status_idx").on(
      table.storeId,
      table.status,
    ),
    uniqueIndex("financing_inquiries_idempotency_unique")
      .on(table.tenantId, table.storeId, table.provider, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    check(
      "financing_inquiries_document_hash_sha256",
      sql`${table.applicantDocumentHash} IS NULL OR ${table.applicantDocumentHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "financing_inquiries_document_last4_valid",
      sql`${table.applicantDocumentLast4} IS NULL OR ${table.applicantDocumentLast4} ~ '^[0-9]{4}$'`,
    ),
    check(
      "financing_inquiries_submission_dates_valid",
      sql`${table.completedAt} IS NULL OR ${table.submittedAt} IS NULL OR ${table.completedAt} >= ${table.submittedAt}`,
    ),
  ],
);

export const financingConditions = pgTable(
  "financing_conditions",
  {
    ...lifecycleColumns,
    accountId: uuid("account_id"),
    approvedAmountCents: integer("approved_amount_cents"),
    bankFebrabanCode: varchar("bank_febraban_code", { length: 16 }),
    bankName: varchar("bank_name", { length: 120 }).notNull(),
    downPaymentCents: integer("down_payment_cents"),
    externalConditionId: varchar("external_condition_id", { length: 191 }),
    inquiryId: uuid("inquiry_id").notNull(),
    installments: integer("installments").notNull(),
    interestRateBasisPoints: integer("interest_rate_basis_points"),
    isSelected: boolean("is_selected").notNull().default(false),
    monthlyPaymentCents: integer("monthly_payment_cents"),
    metadata: jsonb("metadata").notNull().default({}),
    provider: financingProvider("provider").notNull().default("credere"),
    providerResultCode: varchar("provider_result_code", { length: 120 }),
    providerResultMessage: text("provider_result_message"),
    providerResultSummary: jsonb("provider_result_summary")
      .notNull()
      .default({}),
    status: varchar("status", { length: 80 }).notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    summary: text("summary"),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    totalAmountCents: integer("total_amount_cents"),
  },
  (table) => [
    ...(includeFinancingScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.inquiryId, table.tenantId, table.storeId],
            foreignColumns: [
              financingInquiries.id,
              financingInquiries.tenantId,
              financingInquiries.storeId,
            ],
            name: "financing_conditions_inquiry_scope_fk",
          }).onDelete("cascade"),
        ]
      : []),
    index("financing_conditions_inquiry_id_idx").on(table.inquiryId),
    index("financing_conditions_bank_code_idx").on(table.bankFebrabanCode),
    uniqueIndex("financing_conditions_external_unique")
      .on(table.provider, table.externalConditionId)
      .where(sql`${table.externalConditionId} IS NOT NULL`),
    check(
      "financing_conditions_installments_positive",
      sql`${table.installments} > 0`,
    ),
    check(
      "financing_conditions_amounts_non_negative",
      sql`coalesce(${table.approvedAmountCents}, 0) >= 0
        AND coalesce(${table.downPaymentCents}, 0) >= 0
        AND coalesce(${table.monthlyPaymentCents}, 0) >= 0
        AND coalesce(${table.totalAmountCents}, 0) >= 0`,
    ),
    check(
      "financing_conditions_interest_rate_non_negative",
      sql`${table.interestRateBasisPoints} IS NULL OR ${table.interestRateBasisPoints} >= 0`,
    ),
  ],
);
