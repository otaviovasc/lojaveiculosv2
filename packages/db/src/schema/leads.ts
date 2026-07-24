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
import { stores, tenants, users } from "./identity.js";
import { vehicleListings, vehicleUnits } from "./inventory.js";
import { lifecycleColumns, softDeleteColumns } from "./_shared.js";
import { crmPipelines, crmPipelineStages } from "./crmPipeline.js";

export const leadStatus = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "negotiating",
  "won",
  "lost",
  "archived",
]);

export const leadSource = pgEnum("lead_source", [
  "public_site",
  "crm",
  "external_api",
  "manual",
  "olx",
  "whatsapp",
  "other",
]);

export const leadActivityType = pgEnum("lead_activity_type", [
  "note",
  "call",
  "whatsapp",
  "email",
  "status_change",
  "task",
]);

export const leadActivityDirection = pgEnum("lead_activity_direction", [
  "inbound",
  "outbound",
  "internal",
]);

export const leads = pgTable(
  "leads",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    buyerEmail: varchar("buyer_email", { length: 254 }),
    buyerName: varchar("buyer_name", { length: 191 }),
    buyerPhone: varchar("buyer_phone", { length: 40 }),
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    pipelineId: uuid("pipeline_id").references(() => crmPipelines.id),
    pipelineStageId: uuid("pipeline_stage_id").references(
      () => crmPipelineStages.id,
    ),
    source: leadSource("source").notNull(),
    status: leadStatus("status").notNull().default("new"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("leads_assigned_user_id_idx").on(table.assignedUserId),
    index("leads_pipeline_id_idx").on(table.pipelineId),
    index("leads_pipeline_stage_id_idx").on(table.pipelineStageId),
    index("leads_source_idx").on(table.source),
    index("leads_status_idx").on(table.status),
    index("leads_store_status_idx").on(table.storeId, table.status),
    index("leads_tenant_id_idx").on(table.tenantId),
  ],
);

export const leadActivities = pgTable(
  "lead_activities",
  {
    ...lifecycleColumns,
    activityType: leadActivityType("activity_type").notNull(),
    content: text("content").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    direction: leadActivityDirection("direction").notNull().default("internal"),
    idempotencyFingerprint: varchar("idempotency_fingerprint", { length: 64 }),
    idempotencyKey: varchar("idempotency_key", { length: 191 }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    metadata: jsonb("metadata").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    priority: integer("priority").notNull().default(0),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("lead_activities_lead_id_idx").on(table.leadId),
    index("lead_activities_store_occurred_at_idx").on(
      table.storeId,
      table.occurredAt,
    ),
    index("lead_activities_tenant_id_idx").on(table.tenantId),
    uniqueIndex("lead_activities_store_idempotency_key_unique").on(
      table.storeId,
      table.idempotencyKey,
    ),
  ],
);

export const leadVehicleInterests = pgTable(
  "lead_vehicle_interests",
  {
    ...lifecycleColumns,
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => vehicleListings.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    unitId: uuid("unit_id").references(() => vehicleUnits.id),
  },
  (table) => [
    index("lead_vehicle_interests_listing_id_idx").on(table.listingId),
    index("lead_vehicle_interests_store_id_idx").on(table.storeId),
    uniqueIndex("lead_vehicle_interests_unique").on(
      table.leadId,
      table.listingId,
      table.unitId,
    ),
  ],
);

export const leadVisits = pgTable(
  "lead_visits",
  {
    ...lifecycleColumns,
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    listingId: uuid("listing_id").references(() => vehicleListings.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 80 }).notNull().default("scheduled"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    vehicleTitle: varchar("vehicle_title", { length: 191 }),
  },
  (table) => [
    index("lead_visits_lead_id_idx").on(table.leadId),
    index("lead_visits_listing_id_idx").on(table.listingId),
    index("lead_visits_scheduled_at_idx").on(table.scheduledAt),
    index("lead_visits_store_id_idx").on(table.storeId),
  ],
);
