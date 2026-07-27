import { sql } from "drizzle-orm";
import {
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
import { lifecycleColumns } from "./_shared.js";
import { financingCustomerConsents } from "./financingCustomerConsents.js";
import { financingInquiries } from "./financingInquiries.js";
import {
  financingProvider,
  financingProviderAccounts,
  financingProviderEnvironment,
} from "./financingProviders.js";
import { financingProviderStoreMappings } from "./financingProviderStores.js";
import { stores, tenants, users } from "./identity.js";

const includeFinancingScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

export const financingOperationRequestType = pgEnum(
  "financing_operation_request_type",
  ["simulation", "proposal", "status_sync", "callback_sync"],
);

export const financingOperationRequestStatus = pgEnum(
  "financing_operation_request_status",
  ["queued", "submitted", "succeeded", "failed", "cancelled"],
);

export const financingInquiryEventKind = pgEnum(
  "financing_inquiry_event_kind",
  [
    "created",
    "submitted",
    "provider_result",
    "condition_recorded",
    "failed",
    "consent_linked",
  ],
);

export const financingOperationRequests = pgTable(
  "financing_operation_requests",
  {
    ...lifecycleColumns,
    accountId: uuid("account_id"),
    attemptCount: integer("attempt_count").notNull().default(0),
    consentId: uuid("consent_id"),
    errorCode: varchar("error_code", { length: 120 }),
    errorMessage: text("error_message"),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    inquiryId: uuid("inquiry_id"),
    mappingId: uuid("mapping_id"),
    operationType: financingOperationRequestType("operation_type").notNull(),
    provider: financingProvider("provider").notNull(),
    providerEnvironment: financingProviderEnvironment("provider_environment")
      .notNull()
      .default("production"),
    providerOperationId: varchar("provider_operation_id", { length: 191 }),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id),
    resultCode: varchar("result_code", { length: 120 }),
    resultMessage: text("result_message"),
    resultSummary: jsonb("result_summary").notNull().default({}),
    status: financingOperationRequestStatus("status")
      .notNull()
      .default("queued"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
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
            name: "financing_operation_requests_account_scope_fk",
          }),
          foreignKey({
            columns: [
              table.mappingId,
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
            name: "financing_operation_requests_mapping_scope_fk",
          }),
          foreignKey({
            columns: [table.consentId, table.tenantId, table.storeId],
            foreignColumns: [
              financingCustomerConsents.id,
              financingCustomerConsents.tenantId,
              financingCustomerConsents.storeId,
            ],
            name: "financing_operation_requests_consent_scope_fk",
          }),
          foreignKey({
            columns: [table.inquiryId, table.tenantId, table.storeId],
            foreignColumns: [
              financingInquiries.id,
              financingInquiries.tenantId,
              financingInquiries.storeId,
            ],
            name: "financing_operation_requests_inquiry_scope_fk",
          }),
        ]
      : []),
    uniqueIndex("financing_operation_requests_id_scope_unique").on(
      table.id,
      table.tenantId,
      table.storeId,
    ),
    uniqueIndex("financing_operation_requests_idempotency_unique").on(
      table.tenantId,
      table.storeId,
      table.provider,
      table.idempotencyKey,
    ),
    index("financing_operation_requests_status_idx").on(
      table.status,
      table.submittedAt,
    ),
    index("financing_operation_requests_inquiry_idx").on(table.inquiryId),
    check(
      "financing_operation_requests_attempt_count_non_negative",
      sql`${table.attemptCount} >= 0`,
    ),
  ],
);

export const financingInquiryEvents = pgTable(
  "financing_inquiry_events",
  {
    ...lifecycleColumns,
    actorUserId: uuid("actor_user_id").references(() => users.id),
    eventKey: varchar("event_key", { length: 191 }).notNull(),
    eventKind: financingInquiryEventKind("event_kind").notNull(),
    inquiryId: uuid("inquiry_id").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    operationRequestId: uuid("operation_request_id"),
    provider: financingProvider("provider").notNull().default("credere"),
    providerEventId: varchar("provider_event_id", { length: 191 }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
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
            name: "financing_inquiry_events_inquiry_scope_fk",
          }).onDelete("cascade"),
          foreignKey({
            columns: [table.operationRequestId, table.tenantId, table.storeId],
            foreignColumns: [
              financingOperationRequests.id,
              financingOperationRequests.tenantId,
              financingOperationRequests.storeId,
            ],
            name: "financing_inquiry_events_operation_scope_fk",
          }),
        ]
      : []),
    uniqueIndex("financing_inquiry_events_event_key_unique").on(table.eventKey),
    index("financing_inquiry_events_inquiry_created_idx").on(
      table.inquiryId,
      table.createdAt,
    ),
  ],
);
