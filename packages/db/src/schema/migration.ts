import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";

export const migrationRunStatus = pgEnum("migration_run_status", [
  "planned",
  "running",
  "succeeded",
  "failed",
  "rolled_back",
]);

export const migrationRuns = pgTable(
  "migration_runs",
  {
    ...lifecycleColumns,
    completedAt: timestamp("completed_at", { withTimezone: true }),
    dumpLabel: varchar("dump_label", { length: 191 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    status: migrationRunStatus("status").notNull().default("planned"),
  },
  (table) => [index("migration_runs_status_idx").on(table.status)],
);

export const legacyIdMaps = pgTable(
  "legacy_id_maps",
  {
    ...lifecycleColumns,
    legacyId: varchar("legacy_id", { length: 120 }).notNull(),
    migrationRunId: uuid("migration_run_id")
      .notNull()
      .references(() => migrationRuns.id),
    sourceTable: varchar("source_table", { length: 120 }).notNull(),
    targetId: uuid("target_id").notNull(),
    targetTable: varchar("target_table", { length: 120 }).notNull(),
  },
  (table) => [
    uniqueIndex("legacy_id_maps_source_unique").on(
      table.migrationRunId,
      table.sourceTable,
      table.legacyId,
    ),
    index("legacy_id_maps_target_idx").on(table.targetTable, table.targetId),
  ],
);
