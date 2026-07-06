import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { stores, tenants } from "./identity.js";
import { lifecycleColumns, softDeleteColumns } from "./_shared.js";

export const crmPipelineStageStatus = pgEnum("crm_pipeline_stage_status", [
  "open",
  "won",
  "lost",
]);

export const crmPipelines = pgTable(
  "crm_pipelines",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    description: text("description").notNull().default(""),
    isDefault: boolean("is_default").notNull().default(false),
    name: varchar("name", { length: 120 }).notNull(),
    rotationActive: boolean("rotation_active").notNull().default(false),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("crm_pipelines_store_default_idx").on(table.storeId, table.isDefault),
    index("crm_pipelines_tenant_id_idx").on(table.tenantId),
    uniqueIndex("crm_pipelines_store_name_unique").on(
      table.storeId,
      table.name,
    ),
  ],
);

export const crmPipelineStages = pgTable(
  "crm_pipeline_stages",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    color: varchar("color", { length: 16 }).notNull().default("#64748b"),
    isSystem: boolean("is_system").notNull().default(false),
    leadStatus: varchar("lead_status", { length: 40 }).notNull().default("new"),
    name: varchar("name", { length: 120 }).notNull(),
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => crmPipelines.id),
    slaDays: integer("sla_days"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: crmPipelineStageStatus("status").notNull().default("open"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("crm_pipeline_stages_pipeline_idx").on(
      table.pipelineId,
      table.sortOrder,
    ),
    index("crm_pipeline_stages_store_idx").on(table.storeId),
  ],
);
