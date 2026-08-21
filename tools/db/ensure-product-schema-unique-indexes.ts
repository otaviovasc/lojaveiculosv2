import postgres from "../../apps/api/node_modules/postgres/src/index.js";
import { getTableConfig } from "../../packages/db/node_modules/drizzle-orm/pg-core/index.js";
import * as schema from "../../packages/db/src/index.js";

const localDatabaseUrl =
  "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2";

const db = postgres(process.env.DATABASE_URL ?? localDatabaseUrl, { max: 1 });

try {
  const indexes = readUniqueIndexes();
  let created = 0;
  let skipped = 0;

  for (const index of indexes) {
    const [table] = await db`
      select to_regclass(${"public." + index.tableName}) as relation
    `;
    if (!table?.relation) {
      skipped += 1;
      continue;
    }

    await db.unsafe(
      `create unique index if not exists ${quote(index.name)} on ${quote(index.tableName)} (${index.columns.map(quote).join(", ")})`,
    );
    created += 1;
  }

  console.log(
    `Schema bootstrap unique indexes ready (${created} applied, ${skipped} tables not present).`,
  );
} finally {
  await db.end({ timeout: 5 });
}

function readUniqueIndexes() {
  const indexes = [];
  const seen = new Set();

  for (const value of Object.values(schema)) {
    let config;
    try {
      config = getTableConfig(value);
    } catch {
      continue;
    }

    for (const entry of config.indexes) {
      const index = entry.config;
      if (!index.unique || index.where || !Array.isArray(index.columns)) {
        continue;
      }

      const columns = index.columns.map((column) => column?.name);
      if (!index.name || columns.some((column) => !column)) continue;

      const key = `${config.name}:${index.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      indexes.push({
        columns,
        name: index.name,
        tableName: config.name,
      });
    }
  }

  return indexes;
}

function quote(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}
