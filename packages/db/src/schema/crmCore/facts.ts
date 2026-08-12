import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "../_shared.js";
import { stores, tenants, users } from "../identity.js";
import { contacts } from "./contacts.js";
import { factProposalState } from "./enums.js";
import { canonicalMessages } from "./messages.js";
import { revisionCheck, revisionColumn } from "./revision.js";
import { scopedStoreForeignKey } from "./scoped.js";

export const observedFacts = pgTable(
  "observed_facts",
  {
    ...lifecycleColumns,
    confidence: real("confidence").notNull().default(0),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    factKey: varchar("fact_key", { length: 120 }).notNull(),
    factValue: jsonb("fact_value").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revision: revisionColumn(),
    sourceMessageId: uuid("source_message_id").references(
      () => canonicalMessages.id,
    ),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "observed_facts_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.contactId],
      foreignColumns: [contacts.tenantId, contacts.storeId, contacts.id],
      name: "observed_facts_scoped_contact_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.sourceMessageId],
      foreignColumns: [
        canonicalMessages.tenantId,
        canonicalMessages.storeId,
        canonicalMessages.id,
      ],
      name: "observed_facts_scoped_message_fk",
    }),
    check(
      "observed_facts_confidence_range",
      sql`${table.confidence} >= 0 AND ${table.confidence} <= 1`,
    ),
    revisionCheck(table.revision, "observed_facts_revision_nonnegative"),
    uniqueIndex("observed_facts_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    index("observed_facts_contact_key_idx").on(
      table.contactId,
      table.factKey,
      table.observedAt,
    ),
  ],
);

export const factProposals = pgTable(
  "fact_proposals",
  {
    ...lifecycleColumns,
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    factKey: varchar("fact_key", { length: 120 }).notNull(),
    observedFactId: uuid("observed_fact_id")
      .notNull()
      .references(() => observedFacts.id),
    proposedValue: jsonb("proposed_value").notNull(),
    reviewReason: text("review_reason"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    revision: revisionColumn(),
    state: factProposalState("state").notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "fact_proposals_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.contactId],
      foreignColumns: [contacts.tenantId, contacts.storeId, contacts.id],
      name: "fact_proposals_scoped_contact_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.observedFactId],
      foreignColumns: [
        observedFacts.tenantId,
        observedFacts.storeId,
        observedFacts.id,
      ],
      name: "fact_proposals_scoped_observed_fact_fk",
    }),
    check(
      "fact_proposals_review_state_check",
      sql`(${table.state} = 'pending' AND ${table.reviewedAt} IS NULL AND ${table.reviewedByUserId} IS NULL) OR (${table.state} <> 'pending' AND ${table.reviewedAt} IS NOT NULL AND ${table.reviewReason} IS NOT NULL)`,
    ),
    revisionCheck(table.revision, "fact_proposals_revision_nonnegative"),
    uniqueIndex("fact_proposals_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("fact_proposals_observed_fact_unique").on(table.observedFactId),
  ],
);
