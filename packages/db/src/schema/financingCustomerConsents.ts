import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { stores, tenants, users } from "./identity.js";
import { leads } from "./leads.js";

const includeFinancingScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

export const financingCustomerConsentStatus = pgEnum(
  "financing_customer_consent_status",
  ["granted", "revoked", "expired"],
);

export const financingCustomerConsents = pgTable(
  "financing_customer_consents",
  {
    ...lifecycleColumns,
    applicantDocumentHash: varchar("applicant_document_hash", {
      length: 64,
    }).notNull(),
    applicantDocumentLast4: varchar("applicant_document_last4", {
      length: 4,
    }).notNull(),
    consentVersion: varchar("consent_version", { length: 80 }).notNull(),
    evidenceRef: varchar("evidence_ref", { length: 191 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull(),
    grantedByUserId: uuid("granted_by_user_id").references(() => users.id),
    leadId: uuid("lead_id").references(() => leads.id),
    purpose: varchar("purpose", { length: 120 }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    status: financingCustomerConsentStatus("status")
      .notNull()
      .default("granted"),
    storeId: uuid("store_id").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    ...(includeFinancingScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.storeId, table.tenantId],
            foreignColumns: [stores.id, stores.tenantId],
            name: "financing_customer_consents_store_scope_fk",
          }).onDelete("cascade"),
        ]
      : []),
    uniqueIndex("financing_customer_consents_id_scope_unique").on(
      table.id,
      table.tenantId,
      table.storeId,
    ),
    index("financing_customer_consents_document_idx").on(
      table.tenantId,
      table.storeId,
      table.applicantDocumentHash,
    ),
    check(
      "financing_customer_consents_document_hash_sha256",
      sql`${table.applicantDocumentHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "financing_customer_consents_document_last4_valid",
      sql`${table.applicantDocumentLast4} ~ '^[0-9]{4}$'`,
    ),
    check(
      "financing_customer_consents_expiry_valid",
      sql`${table.expiresAt} IS NULL OR ${table.expiresAt} > ${table.grantedAt}`,
    ),
    check(
      "financing_customer_consents_revocation_consistent",
      sql`(
        (${table.status} = 'revoked' AND ${table.revokedAt} IS NOT NULL)
        OR
        (${table.status} <> 'revoked' AND ${table.revokedAt} IS NULL)
      )`,
    ),
  ],
);
