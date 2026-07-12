import { sql } from "drizzle-orm";
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
import { lifecycleColumns } from "./_shared.js";
import { stores, tenants } from "./identity.js";

const includeAutomationScopeForeignKeys =
  process.env.DRIZZLE_AUTOMATION_BOOTSTRAP !== "true";

export const automationRunStatus = pgEnum("automation_run_status", [
  "awaiting_approval",
  "approved",
  "rejected",
  "cancelled",
]);
export const automationStepStatus = pgEnum("automation_step_status", [
  "awaiting_approval",
  "approved",
  "rejected",
  "cancelled",
]);
export const automationApprovalStatus = pgEnum("automation_approval_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);
export const automationStepKind = pgEnum("automation_step_kind", [
  "read_only_preview",
]);
export const automationRiskLevel = pgEnum("automation_risk_level", ["low"]);

export const automationRuns = pgTable(
  "automation_runs",
  {
    ...lifecycleColumns,
    context: jsonb("context").notNull().default({}),
    createdByActorId: varchar("created_by_actor_id", { length: 191 }).notNull(),
    executionEnabled: boolean("execution_enabled").notNull().default(false),
    objective: text("objective").notNull(),
    status: automationRunStatus("status")
      .notNull()
      .default("awaiting_approval"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    uniqueIndex("automation_runs_id_scope_unique").on(
      table.id,
      table.tenantId,
      table.storeId,
    ),
    index("automation_runs_scope_created_idx").on(
      table.tenantId,
      table.storeId,
      table.createdAt,
    ),
    index("automation_runs_store_status_idx").on(table.storeId, table.status),
    check(
      "automation_runs_execution_disabled",
      sql`${table.executionEnabled} = false`,
    ),
    check("automation_runs_version_positive", sql`${table.version} > 0`),
  ],
);

export const automationSteps = pgTable(
  "automation_steps",
  {
    ...lifecycleColumns,
    executionEnabled: boolean("execution_enabled").notNull().default(false),
    kind: automationStepKind("kind").notNull().default("read_only_preview"),
    position: integer("position").notNull(),
    risk: automationRiskLevel("risk").notNull().default("low"),
    runId: uuid("run_id").notNull(),
    status: automationStepStatus("status")
      .notNull()
      .default("awaiting_approval"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    summary: text("summary").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    title: varchar("title", { length: 191 }).notNull(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    uniqueIndex("automation_steps_id_run_scope_unique").on(
      table.id,
      table.runId,
      table.tenantId,
      table.storeId,
    ),
    ...(includeAutomationScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.runId, table.tenantId, table.storeId],
            foreignColumns: [
              automationRuns.id,
              automationRuns.tenantId,
              automationRuns.storeId,
            ],
            name: "automation_steps_run_scope_fk",
          }).onDelete("cascade"),
        ]
      : []),
    uniqueIndex("automation_steps_run_position_unique").on(
      table.runId,
      table.position,
    ),
    index("automation_steps_scope_run_idx").on(
      table.tenantId,
      table.storeId,
      table.runId,
    ),
    check(
      "automation_steps_execution_disabled",
      sql`${table.executionEnabled} = false`,
    ),
    check("automation_steps_position_positive", sql`${table.position} > 0`),
    check("automation_steps_version_positive", sql`${table.version} > 0`),
  ],
);

export const automationApprovals = pgTable(
  "automation_approvals",
  {
    ...lifecycleColumns,
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedByActorId: varchar("decided_by_actor_id", { length: 191 }),
    proposalDigest: varchar("proposal_digest", { length: 64 }).notNull(),
    runId: uuid("run_id").notNull(),
    status: automationApprovalStatus("status").notNull().default("pending"),
    stepId: uuid("step_id").notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    ...(includeAutomationScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.stepId, table.runId, table.tenantId, table.storeId],
            foreignColumns: [
              automationSteps.id,
              automationSteps.runId,
              automationSteps.tenantId,
              automationSteps.storeId,
            ],
            name: "automation_approvals_step_run_scope_fk",
          }).onDelete("cascade"),
        ]
      : []),
    uniqueIndex("automation_approvals_step_unique").on(table.stepId),
    index("automation_approvals_scope_run_idx").on(
      table.tenantId,
      table.storeId,
      table.runId,
    ),
    check("automation_approvals_version_positive", sql`${table.version} > 0`),
    check(
      "automation_approvals_proposal_digest_sha256",
      sql`${table.proposalDigest} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "automation_approvals_decision_actor_consistent",
      sql`(
        (${table.status} = 'pending' AND ${table.decidedAt} IS NULL AND ${table.decidedByActorId} IS NULL)
        OR
        (${table.status} <> 'pending' AND ${table.decidedAt} IS NOT NULL AND ${table.decidedByActorId} IS NOT NULL)
      )`,
    ),
  ],
);
