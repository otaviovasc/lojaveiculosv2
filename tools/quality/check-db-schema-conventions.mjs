import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const schemaRoots = [
  new URL("../../packages/db/src/schema", import.meta.url).pathname,
  new URL("../../packages/audit-db/src/schema", import.meta.url).pathname,
];
const ignoredFiles = new Set(["_shared.ts"]);
const tableNamePattern = /^[a-z][a-z0-9_]*$/;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walk(path, files);
    } else if (path.endsWith(".ts") && !ignoredFiles.has(entry)) {
      files.push(path);
    }
  }

  return files;
}

const failures = [];

for (const schemaRoot of schemaRoots) {
  for (const file of walk(schemaRoot)) {
    const source = readFileSync(file, "utf8");
    const tableMatches = [...source.matchAll(/pgTable\(\s*"([^"]+)"/g)];

    for (const [, tableName] of tableMatches) {
      if (!tableNamePattern.test(tableName)) {
        failures.push(`${file}: table "${tableName}" is not lower_snake_case`);
      }
    }

    const tableBlocks = source.split(/export const \w+ = pgTable\(/).slice(1);

    for (const block of tableBlocks) {
      if (
        !block.includes("...lifecycleColumns") &&
        !block.includes("...auditLifecycleColumns")
      ) {
        failures.push(`${file}: pgTable missing lifecycle columns helper`);
      }

      if (
        block.includes('uuid("id"') ||
        block.includes('timestamp("created_at"')
      ) {
        failures.push(
          `${file}: use lifecycleColumns instead of inline id/timestamps`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error("DB schema convention violations:");
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}
