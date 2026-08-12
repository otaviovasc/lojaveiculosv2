import { sql } from "drizzle-orm";
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
import { contactIdentities, contacts, opportunities } from "./contacts.js";
import { conversationThreads } from "./conversations.js";
import {
  acquisitionSource,
  consentReceiptState,
  messagingChannel,
} from "./enums.js";
import { revisionCheck, revisionColumn } from "./revision.js";
import { scopedStoreForeignKey } from "./scoped.js";

export const acquisitionTouchpoints = pgTable(
  "acquisition_touchpoints",
  {
    ...lifecycleColumns,
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    externalReference: varchar("external_reference", { length: 191 }),
    metadata: jsonb("metadata").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id),
    providerConnectionId: uuid("provider_connection_id").references(
      () => providerConnections.id,
    ),
    revision: revisionColumn(),
    source: acquisitionSource("source").notNull(),
    threadId: uuid("thread_id").references(() => conversationThreads.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "acquisition_touchpoints_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.contactId],
      foreignColumns: [contacts.tenantId, contacts.storeId, contacts.id],
      name: "acquisition_touchpoints_scoped_contact_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.opportunityId],
      foreignColumns: [
        opportunities.tenantId,
        opportunities.storeId,
        opportunities.id,
      ],
      name: "acquisition_touchpoints_scoped_opportunity_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.providerConnectionId],
      foreignColumns: [
        providerConnections.tenantId,
        providerConnections.storeId,
        providerConnections.id,
      ],
      name: "acquisition_touchpoints_scoped_connection_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.threadId],
      foreignColumns: [
        conversationThreads.tenantId,
        conversationThreads.storeId,
        conversationThreads.id,
      ],
      name: "acquisition_touchpoints_scoped_thread_fk",
    }),
    revisionCheck(
      table.revision,
      "acquisition_touchpoints_revision_nonnegative",
    ),
    uniqueIndex("acquisition_touchpoints_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("acquisition_touchpoints_external_unique")
      .on(table.tenantId, table.storeId, table.source, table.externalReference)
      .where(sql`${table.externalReference} IS NOT NULL`),
  ],
);

export const consentReceipts = pgTable(
  "consent_receipts",
  {
    ...lifecycleColumns,
    channel: messagingChannel("channel"),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    evidenceReference: varchar("evidence_reference", { length: 191 }).notNull(),
    identityId: uuid("identity_id").references(() => contactIdentities.id),
    legalBasis: varchar("legal_basis", { length: 80 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    purpose: varchar("purpose", { length: 120 }).notNull(),
    policyVersion: varchar("policy_version", { length: 80 }).notNull(),
    revision: revisionColumn(),
    source: acquisitionSource("source").notNull(),
    state: consentReceiptState("state").notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "consent_receipts_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.contactId],
      foreignColumns: [contacts.tenantId, contacts.storeId, contacts.id],
      name: "consent_receipts_scoped_contact_fk",
    }),
    foreignKey({
      columns: [
        table.tenantId,
        table.storeId,
        table.identityId,
        table.contactId,
      ],
      foreignColumns: [
        contactIdentities.tenantId,
        contactIdentities.storeId,
        contactIdentities.id,
        contactIdentities.contactId,
      ],
      name: "consent_receipts_semantic_identity_fk",
    }),
    revisionCheck(table.revision, "consent_receipts_revision_nonnegative"),
    uniqueIndex("consent_receipts_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("consent_receipts_evidence_unique").on(
      table.tenantId,
      table.storeId,
      table.evidenceReference,
    ),
    index("consent_receipts_contact_purpose_idx").on(
      table.contactId,
      table.purpose,
      table.occurredAt,
    ),
  ],
);
