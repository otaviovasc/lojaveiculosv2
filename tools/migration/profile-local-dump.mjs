#!/usr/bin/env node

import { createReadStream, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { createInterface } from "node:readline";

const [, , dumpPath, outputPath] = process.argv;

if (!dumpPath || dumpPath === "--help" || dumpPath === "-h") {
  console.error(
    [
      "Usage:",
      "  node tools/migration/profile-local-dump.mjs /path/to/local-v1.dump.sql [output.json]",
      "",
      "Input must be a local plain SQL pg_dump file. This script does not connect",
      "to a database and must not be pointed at production systems.",
    ].join("\n"),
  );
  process.exit(dumpPath ? 0 : 1);
}

const safeDistributionColumn =
  /(^|_)(status|state|type|kind|role|plan|category|source|origin)(_|$)/i;
const duplicateCandidateColumn =
  /(^|_)(id|slug|email|cpf|cnpj|document|plate|placa|external_id|asaas_id)(_|$)/i;
const sensitiveColumn =
  /(token|secret|password|payload|raw|metadata|pdf|document_body|message|phone|telefone|whatsapp)/i;
const maxDistributionValues = 25;
const maxTrackedDistinctValues = 100_000;

const profile = {
  generated_at: new Date().toISOString(),
  input_file: basename(dumpPath),
  warning:
    "Local dump profile only. Review before sharing; do not commit customer-derived output unless sanitized.",
  tables: {},
};

let currentCopy = null;

const rl = createInterface({
  input: createReadStream(resolve(dumpPath), { encoding: "utf8" }),
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  if (currentCopy) {
    if (line === "\\.") {
      finishCopy();
      return;
    }

    profileCopyRow(line);
    return;
  }

  const copy = parseCopyStart(line);
  if (copy) {
    currentCopy = copy;
    ensureTable(copy.table, copy.columns);
  }
});

rl.on("close", () => {
  if (currentCopy) {
    finishCopy();
  }

  finalizeProfile();

  const json = `${JSON.stringify(profile, null, 2)}\n`;
  if (outputPath) {
    writeFileSync(resolve(outputPath), json);
    console.log(`Wrote local dump profile to ${outputPath}`);
  } else {
    process.stdout.write(json);
  }
});

rl.on("error", (error) => {
  console.error(`Failed to read dump: ${error.message}`);
  process.exit(1);
});

function parseCopyStart(line) {
  const match = line.match(/^COPY\s+(.+?)\s+\((.+)\)\s+FROM\s+stdin;$/i);
  if (!match) {
    return null;
  }

  const [, rawTable, rawColumns] = match;
  const table = normalizeIdentifier(rawTable);
  const columns = splitColumns(rawColumns).map(normalizeColumnIdentifier);

  return { table, columns };
}

function splitColumns(rawColumns) {
  const columns = [];
  let current = "";
  let quoted = false;

  for (const char of rawColumns) {
    if (char === '"') {
      quoted = !quoted;
      current += char;
      continue;
    }

    if (char === "," && !quoted) {
      columns.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    columns.push(current.trim());
  }

  return columns;
}

function normalizeIdentifier(identifier) {
  return splitIdentifierParts(identifier)
    .map((part) =>
      part.trim().replace(/^"/, "").replace(/"$/, "").replaceAll('""', '"'),
    )
    .join(".");
}

function splitIdentifierParts(identifier) {
  const parts = [];
  let current = "";
  let quoted = false;

  for (const char of identifier.trim()) {
    if (char === '"') {
      quoted = !quoted;
      current += char;
      continue;
    }

    if (char === "." && !quoted) {
      parts.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}

function normalizeColumnIdentifier(identifier) {
  return identifier
    .trim()
    .replace(/^"/, "")
    .replace(/"$/, "")
    .replaceAll('""', '"');
}

function ensureTable(tableName, columns) {
  if (profile.tables[tableName]) {
    return;
  }

  profile.tables[tableName] = {
    row_count: 0,
    columns: Object.fromEntries(
      columns.map((column) => [
        column,
        {
          null_count: 0,
          empty_string_count: 0,
        },
      ]),
    ),
    distributions: {},
    duplicate_candidates: {},
  };

  for (const column of columns) {
    if (shouldTrackDistribution(column)) {
      profile.tables[tableName].distributions[column] = new Map();
    }

    if (shouldTrackDuplicates(column)) {
      profile.tables[tableName].duplicate_candidates[column] = {
        duplicate_count: 0,
        tracked_distinct_count: 0,
        tracking_truncated: false,
        seen: new Set(),
      };
    }
  }
}

function profileCopyRow(line) {
  const table = profile.tables[currentCopy.table];
  const values = parseCopyTextRow(line);
  table.row_count += 1;

  currentCopy.columns.forEach((column, index) => {
    const value = values[index] ?? null;
    const columnProfile = table.columns[column];

    if (value === null) {
      columnProfile.null_count += 1;
      return;
    }

    if (value === "") {
      columnProfile.empty_string_count += 1;
    }

    const distribution = table.distributions[column];
    if (distribution && value.length <= 80) {
      distribution.set(value, (distribution.get(value) ?? 0) + 1);
    }

    const duplicateProfile = table.duplicate_candidates[column];
    if (duplicateProfile && value !== "") {
      trackDuplicate(duplicateProfile, value);
    }
  });
}

function parseCopyTextRow(line) {
  return line.split("\t").map((value) => {
    if (value === "\\N") {
      return null;
    }

    return value
      .replaceAll("\\t", "\t")
      .replaceAll("\\n", "\n")
      .replaceAll("\\r", "\r")
      .replaceAll("\\\\", "\\");
  });
}

function shouldTrackDistribution(column) {
  return safeDistributionColumn.test(column) && !sensitiveColumn.test(column);
}

function shouldTrackDuplicates(column) {
  return duplicateCandidateColumn.test(column) && !sensitiveColumn.test(column);
}

function trackDuplicate(duplicateProfile, value) {
  if (duplicateProfile.seen.has(value)) {
    duplicateProfile.duplicate_count += 1;
    return;
  }

  if (duplicateProfile.seen.size >= maxTrackedDistinctValues) {
    duplicateProfile.tracking_truncated = true;
    return;
  }

  duplicateProfile.seen.add(value);
  duplicateProfile.tracked_distinct_count = duplicateProfile.seen.size;
}

function finishCopy() {
  currentCopy = null;
}

function finalizeProfile() {
  for (const table of Object.values(profile.tables)) {
    for (const [column, distribution] of Object.entries(table.distributions)) {
      table.distributions[column] = [...distribution.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, maxDistributionValues)
        .map(([value, count]) => ({ value, count }));
    }

    for (const duplicateProfile of Object.values(table.duplicate_candidates)) {
      delete duplicateProfile.seen;
    }
  }
}
