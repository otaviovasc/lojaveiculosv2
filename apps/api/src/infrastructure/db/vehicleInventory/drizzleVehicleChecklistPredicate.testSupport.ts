import type { StoredRows } from "./drizzleVehicleInventoryRepository.testRows.js";

export type SqlPredicate = {
  toQuery: (config: unknown) => { params: unknown[]; sql: string };
};

export function filterChecklistRows(
  rows: StoredRows["checklists"],
  predicate?: SqlPredicate,
): StoredRows["checklists"] {
  if (!predicate) return rows;
  return rows.filter((row) => matchesChecklistPredicate(row, predicate));
}

export function updateFirstMatchingChecklist(
  rows: StoredRows["checklists"],
  record: Partial<StoredRows["checklists"][number]>,
  predicate?: SqlPredicate,
): readonly StoredRows["checklists"][number][] {
  const index = rows.findIndex((row) =>
    matchesChecklistPredicate(row, predicate),
  );
  if (index === -1) return [];
  const current = rows[index];
  if (!current) return [];
  const row: StoredRows["checklists"][number] = { ...current, ...record };
  rows[index] = row;
  return [row];
}

function matchesChecklistPredicate(
  row: StoredRows["checklists"][number],
  predicate?: SqlPredicate,
): boolean {
  if (!predicate) return true;
  const { params, sql } = predicate.toQuery({
    casing: { getColumnCasing: (column: { name: string }) => column.name },
    escapeName: (name: string) => name,
    escapeParam: (index: number) => `$${index + 1}`,
    escapeString: (value: string) => `'${value.replaceAll("'", "''")}'`,
  });
  return (
    matchesEqualClauses(row, sql, params) && matchesInClauses(row, sql, params)
  );
}

function matchesEqualClauses(
  row: StoredRows["checklists"][number],
  sql: string,
  params: readonly unknown[],
): boolean {
  for (const match of sql.matchAll(/vehicle_checklists\.(\w+) = \$(\d+)/g)) {
    const [, column, index] = match;
    if (!column || !index) return false;
    if (rowValue(row, column) !== params[Number(index) - 1]) return false;
  }
  return true;
}

function matchesInClauses(
  row: StoredRows["checklists"][number],
  sql: string,
  params: readonly unknown[],
): boolean {
  for (const match of sql.matchAll(
    /vehicle_checklists\.(\w+) in \(([^)]+)\)/g,
  )) {
    const [, column, placeholders] = match;
    if (!column || !placeholders) return false;
    const values = [...placeholders.matchAll(/\$(\d+)/g)].map(([, index]) =>
      index ? params[Number(index) - 1] : undefined,
    );
    if (!values.includes(rowValue(row, column))) return false;
  }
  return true;
}

function rowValue(row: StoredRows["checklists"][number], column: string) {
  const fields = {
    id: row.id,
    store_id: row.storeId,
    tenant_id: row.tenantId,
    unit_id: row.unitId,
  };
  return fields[column as keyof typeof fields];
}
