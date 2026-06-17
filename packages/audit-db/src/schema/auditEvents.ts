import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditLifecycleColumns } from "./_shared.js";

export const auditActorKind = pgEnum("audit_actor_kind", [
  "integration",
  "public",
  "system",
  "user",
]);

export const auditCategory = pgEnum("audit_category", [
  "authentication",
  "authorization",
  "data_access",
  "data_change",
  "integration",
  "system",
]);

export const auditCriticality = pgEnum("audit_criticality", [
  "critical",
  "high",
  "low",
  "medium",
]);

export const auditDataClassification = pgEnum("audit_data_classification", [
  "confidential",
  "internal",
  "public",
  "restricted",
]);

export const auditFailureTier = pgEnum("audit_failure_tier", [
  "best_effort",
  "important",
  "required",
]);

export const auditOutcome = pgEnum("audit_outcome", [
  "attempted",
  "denied",
  "failed",
  "succeeded",
]);

export const auditSeverity = pgEnum("audit_severity", [
  "critical",
  "debug",
  "error",
  "info",
  "warning",
]);

export const auditEvents = pgTable(
  "audit_events",
  {
    ...auditLifecycleColumns,
    action: varchar("action", { length: 120 }).notNull(),
    actorId: varchar("actor_id", { length: 191 }).notNull(),
    actorKind: auditActorKind("actor_kind").notNull(),
    category: auditCategory("category"),
    changes: jsonb("changes").notNull().default([]),
    correlationId: varchar("correlation_id", { length: 191 }),
    criticality: auditCriticality("criticality").notNull().default("low"),
    dataClassification: auditDataClassification("data_classification")
      .notNull()
      .default("internal"),
    entityId: varchar("entity_id", { length: 191 }).notNull(),
    entityType: varchar("entity_type", { length: 120 }).notNull(),
    failureTier: auditFailureTier("failure_tier")
      .notNull()
      .default("best_effort"),
    metadata: jsonb("metadata").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    outcome: auditOutcome("outcome").notNull().default("succeeded"),
    providerEventId: varchar("provider_event_id", { length: 191 }),
    providerName: varchar("provider_name", { length: 120 }),
    relatedEntities: jsonb("related_entities").notNull().default([]),
    requestContext: jsonb("request_context").notNull().default({}),
    requestId: varchar("request_id", { length: 191 }).notNull(),
    schemaVersion: integer("schema_version").notNull().default(1),
    severity: auditSeverity("severity").notNull().default("info"),
    source: jsonb("source").notNull().default({}),
    storeId: uuid("store_id"),
    summary: text("summary"),
    tags: jsonb("tags").notNull().default([]),
    target: jsonb("target").notNull().default({}),
    tenantId: uuid("tenant_id"),
  },
  (table) => [
    index("audit_events_action_idx").on(table.action),
    index("audit_events_category_idx").on(table.category),
    index("audit_events_correlation_id_idx").on(table.correlationId),
    index("audit_events_entity_idx").on(table.entityType, table.entityId),
    index("audit_events_occurred_at_idx").on(table.occurredAt),
    index("audit_events_outcome_idx").on(table.outcome),
    index("audit_events_request_id_idx").on(table.requestId),
    index("audit_events_severity_idx").on(table.severity),
    index("audit_events_store_id_idx").on(table.storeId),
    index("audit_events_tenant_id_idx").on(table.tenantId),
  ],
);
