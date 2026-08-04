import postgres, { type Sql, type TransactionSql } from "postgres";
import type { ResetResourceAdapter } from "./resetNonProductionEnvironment.js";
import {
  productBaselineCounts,
  seedProductBaseline,
} from "./resetProductBaseline.js";

const VEHICLE_CATALOG_PREFIX = "vehicle_catalog_";

type TableNameRow = { table_name: string };
type CountRow = { count: number };

export function createProductPostgresResetAdapter(
  databaseUrl: string,
): ResetResourceAdapter {
  const sql = postgres(databaseUrl, { max: 1 });

  return {
    close: () => sql.end(),
    inspect: async () => inspectProductDatabase(sql),
    name: "product-postgres",
    reset: async () => resetProductDatabase(sql),
  };
}

export function createAuditPostgresResetAdapter(
  databaseUrl: string,
): ResetResourceAdapter {
  const sql = postgres(databaseUrl, { max: 1 });

  return {
    close: () => sql.end(),
    inspect: async () => {
      const tables = await listPublicDataTables(sql);
      return {
        rowsToDelete: await countRowsForTables(sql, tables),
        tablesToTruncate: tables.length,
      };
    },
    name: "audit-postgres",
    reset: async () => {
      const result = await sql.begin(async (transaction) => {
        const tables = await listPublicDataTables(transaction);
        await truncateTables(transaction, tables);
        const remainingRows = await countRowsForTables(transaction, tables);
        if (remainingRows !== 0) {
          throw new Error(`Audit reset left ${remainingRows} row(s) behind.`);
        }
        return { remainingRows, tablesTruncated: tables.length };
      });
      return result;
    },
  };
}

export function partitionProductTables(tableNames: readonly string[]): {
  preserved: string[];
  resettable: string[];
} {
  const preserved = tableNames.filter((tableName) =>
    tableName.startsWith(VEHICLE_CATALOG_PREFIX),
  );
  const resettable = tableNames.filter(
    (tableName) => !tableName.startsWith(VEHICLE_CATALOG_PREFIX),
  );
  return { preserved, resettable };
}

export function createTruncateStatement(tableNames: readonly string[]): string {
  if (tableNames.length === 0) {
    throw new Error("No PostgreSQL tables were selected for reset.");
  }
  return `TRUNCATE TABLE ${tableNames
    .map((tableName) => `"public".${quoteIdentifier(tableName)}`)
    .join(", ")} RESTART IDENTITY`;
}

async function inspectProductDatabase(sql: Sql) {
  const tables = partitionProductTables(await listPublicDataTables(sql));
  return {
    catalogRowsPreserved: await countRowsForTables(sql, tables.preserved),
    catalogTablesPreserved: tables.preserved.length,
    rowsToDelete: await countRowsForTables(sql, tables.resettable),
    stores: await countRowsForTables(sql, ["stores"]),
    tablesToTruncate: tables.resettable.length,
    tenants: await countRowsForTables(sql, ["tenants"]),
    users: await countRowsForTables(sql, ["users"]),
  };
}

async function resetProductDatabase(sql: Sql) {
  return sql.begin(async (transaction) => {
    const tables = partitionProductTables(
      await listPublicDataTables(transaction),
    );
    const catalogRowsBefore = await countRowsForTables(
      transaction,
      tables.preserved,
    );

    await truncateTables(transaction, tables.resettable);
    await seedProductBaseline(transaction);

    const catalogRowsAfter = await countRowsForTables(
      transaction,
      tables.preserved,
    );
    if (catalogRowsAfter !== catalogRowsBefore) {
      throw new Error("Vehicle catalog row count changed during reset.");
    }
    await assertProductBaseline(transaction);

    return {
      ...productBaselineCounts,
      catalogRowsPreserved: catalogRowsAfter,
      tablesTruncated: tables.resettable.length,
      users: 0,
    };
  });
}

async function listPublicDataTables(
  sql: Sql | TransactionSql,
): Promise<string[]> {
  const rows = await sql<TableNameRow[]>`
    SELECT relation.relname AS table_name
    FROM pg_class AS relation
    INNER JOIN pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relkind IN ('r', 'p')
      AND NOT EXISTS (
        SELECT 1
        FROM pg_inherits
        WHERE pg_inherits.inhrelid = relation.oid
      )
    ORDER BY relation.relname
  `;
  return rows.map((row) => row.table_name);
}

async function truncateTables(
  sql: TransactionSql,
  tableNames: readonly string[],
): Promise<void> {
  await sql.unsafe(createTruncateStatement(tableNames));
}

async function countRowsForTables(
  sql: Sql | TransactionSql,
  tableNames: readonly string[],
): Promise<number> {
  let total = 0;
  for (const tableName of tableNames) {
    const [row] = await sql.unsafe<CountRow[]>(
      `SELECT COUNT(*)::integer AS count FROM "public".${quoteIdentifier(tableName)}`,
    );
    total += row?.count ?? 0;
  }
  return total;
}

async function assertProductBaseline(sql: TransactionSql): Promise<void> {
  const expected = {
    addons: productBaselineCounts.addons,
    plan_features: productBaselineCounts.planFeatures,
    plans: productBaselineCounts.plans,
    role_template_permissions: productBaselineCounts.roleTemplatePermissions,
    role_templates: productBaselineCounts.roleTemplates,
    stores: 0,
    tenants: 0,
    users: 0,
  };

  for (const [tableName, expectedCount] of Object.entries(expected)) {
    const [row] = await sql.unsafe<CountRow[]>(
      `SELECT COUNT(*)::integer AS count FROM "public".${quoteIdentifier(tableName)}`,
    );
    if (row?.count !== expectedCount) {
      throw new Error(
        `Product reset verification failed for ${tableName}: expected ${expectedCount}, received ${row?.count ?? 0}.`,
      );
    }
  }
}

function quoteIdentifier(value: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe PostgreSQL identifier: ${value}`);
  }
  return `"${value}"`;
}
