import {
  automationApprovals,
  automationRuns,
  automationSteps,
} from "@lojaveiculosv2/db";
import type { DrizzleAutomationClient } from "./drizzleAutomationRunRepository.js";
import type {
  AutomationApprovalRow,
  AutomationRunRow,
  AutomationStepRow,
} from "./drizzleAutomationMappers.js";

export const automationTestIds = {
  approvalId: "10000000-0000-4000-8000-000000000003",
  runId: "10000000-0000-4000-8000-000000000001",
  stepId: "10000000-0000-4000-8000-000000000002",
  storeId: "20000000-0000-4000-8000-000000000001",
  tenantId: "30000000-0000-4000-8000-000000000001",
} as const;

export type AutomationStoredRows = {
  approvals: AutomationApprovalRow[];
  runs: AutomationRunRow[];
  steps: AutomationStepRow[];
};

type StoredRow = AutomationApprovalRow | AutomationRunRow | AutomationStepRow;
type SqlPredicate = {
  toQuery: (config: unknown) => { params: unknown[]; sql: string };
};
type SelectBuilder = Promise<StoredRow[]> & {
  limit: (count: number) => SelectBuilder;
  offset: (count: number) => SelectBuilder;
  orderBy: (...columns: unknown[]) => SelectBuilder;
  where: (predicate: unknown) => SelectBuilder;
};
type UpdateBuilder = Promise<StoredRow[]> & {
  returning: (selection: Record<string, unknown>) => Promise<{ id: string }[]>;
};

export function createAutomationStoredRows(): AutomationStoredRows {
  const now = new Date("2026-07-11T12:00:00.000Z");
  return {
    approvals: [
      {
        createdAt: now,
        decidedAt: null,
        decidedByActorId: null,
        id: automationTestIds.approvalId,
        proposalDigest: "a".repeat(64),
        runId: automationTestIds.runId,
        status: "pending",
        stepId: automationTestIds.stepId,
        storeId: automationTestIds.storeId,
        tenantId: automationTestIds.tenantId,
        updatedAt: now,
        version: 1,
      },
    ],
    runs: [
      {
        context: { module: "inventory" },
        createdAt: now,
        createdByActorId: "user_1",
        executionEnabled: false,
        id: automationTestIds.runId,
        objective: "Review inventory readiness",
        status: "awaiting_approval",
        storeId: automationTestIds.storeId,
        tenantId: automationTestIds.tenantId,
        updatedAt: now,
        version: 1,
      },
    ],
    steps: [
      {
        createdAt: now,
        executionEnabled: false,
        id: automationTestIds.stepId,
        kind: "read_only_preview",
        position: 1,
        risk: "low",
        runId: automationTestIds.runId,
        status: "awaiting_approval",
        storeId: automationTestIds.storeId,
        summary: "Read-only preview",
        tenantId: automationTestIds.tenantId,
        title: "Review preview",
        updatedAt: now,
        version: 1,
      },
    ],
  };
}

export function createFakeAutomationDb(
  initialRows: AutomationStoredRows = createAutomationStoredRows(),
) {
  const rows = structuredClone(initialRows);
  const telemetry = { transactionCalls: 0 };
  return { db: createClient(rows, telemetry), rows, telemetry };
}

function createClient(
  rows: AutomationStoredRows,
  telemetry: { transactionCalls: number },
): DrizzleAutomationClient {
  const client = {
    select() {
      return {
        from(table: unknown) {
          return selectBuilder(tableRows(rows, table));
        },
      };
    },
    update(table: unknown) {
      return {
        set(changes: Record<string, unknown>) {
          return {
            where(predicate: unknown) {
              return updateBuilder(tableRows(rows, table), changes, predicate);
            },
          };
        },
      };
    },
    async transaction<Result>(
      action: (transaction: DrizzleAutomationClient) => Promise<Result>,
    ) {
      telemetry.transactionCalls += 1;
      const draft = structuredClone(rows);
      const result = await action(createClient(draft, telemetry));
      replaceRows(rows, draft);
      return result;
    },
  };
  return client as unknown as DrizzleAutomationClient;
}

function selectBuilder(
  source: StoredRow[],
  predicate?: unknown,
  offset = 0,
  limit?: number,
): SelectBuilder {
  const selected = source.filter((row) => matches(row, predicate));
  const materialized = selected.slice(
    offset,
    limit ? offset + limit : undefined,
  );
  return Object.assign(Promise.resolve(materialized), {
    limit: (count: number) => selectBuilder(source, predicate, offset, count),
    offset: (count: number) => selectBuilder(source, predicate, count, limit),
    orderBy: (..._columns: unknown[]) =>
      selectBuilder(source, predicate, offset, limit),
    where: (nextPredicate: unknown) =>
      selectBuilder(source, nextPredicate, offset, limit),
  });
}

function updateBuilder(
  source: StoredRow[],
  changes: Record<string, unknown>,
  predicate: unknown,
): UpdateBuilder {
  const updated = source.filter((row) => matches(row, predicate));
  for (const row of updated) applyChanges(row, changes);
  return Object.assign(Promise.resolve(updated), {
    returning: async (_selection: Record<string, unknown>) =>
      updated.map((row) => ({ id: row.id })),
  });
}

function matches(row: StoredRow, predicate: unknown): boolean {
  if (!isSqlPredicate(predicate)) return true;
  const { params, sql } = predicate.toQuery(sqlRenderConfig);
  for (const match of sql.matchAll(
    /automation_(?:runs|steps|approvals)\.(\w+) = \$(\d+)/g,
  )) {
    const [, column, parameterIndex] = match;
    if (!column || !parameterIndex) return false;
    if (rowValue(row, column) !== params[Number(parameterIndex) - 1]) {
      return false;
    }
  }
  return true;
}

function applyChanges(row: StoredRow, changes: Record<string, unknown>) {
  const record = row as unknown as Record<string, unknown>;
  for (const [field, value] of Object.entries(changes)) {
    record[field] =
      field === "version" && isSqlPredicate(value)
        ? Number(record[field]) + 1
        : value;
  }
}

function rowValue(row: StoredRow, column: string): unknown {
  const field = column.replace(/_([a-z])/g, (_match, letter: string) =>
    letter.toUpperCase(),
  );
  return (row as unknown as Record<string, unknown>)[field];
}

function isSqlPredicate(value: unknown): value is SqlPredicate {
  return Boolean(
    value &&
    typeof value === "object" &&
    "toQuery" in value &&
    typeof value.toQuery === "function",
  );
}

function tableRows(rows: AutomationStoredRows, table: unknown): StoredRow[] {
  if (table === automationRuns) return rows.runs;
  if (table === automationSteps) return rows.steps;
  if (table === automationApprovals) return rows.approvals;
  throw new Error(`Unhandled automation table: ${String(table)}`);
}

function replaceRows(
  target: AutomationStoredRows,
  source: AutomationStoredRows,
) {
  target.runs.splice(0, target.runs.length, ...source.runs);
  target.steps.splice(0, target.steps.length, ...source.steps);
  target.approvals.splice(0, target.approvals.length, ...source.approvals);
}

const sqlRenderConfig = {
  casing: { getColumnCasing: (column: { name: string }) => column.name },
  escapeName: (name: string) => name,
  escapeParam: (index: number) => `$${index + 1}`,
  escapeString: (value: string) => `'${value.replaceAll("'", "''")}'`,
};
