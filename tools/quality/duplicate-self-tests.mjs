import { prepareDuplicateSource } from "./duplicate-allow-markers.mjs";
import {
  findCloneWindows,
  normalizeImplementation,
} from "./duplicate-normalize.mjs";
import {
  normalizeOptionCollection,
  shouldTrackImplementation,
  shouldTrackOptionCollection,
} from "./duplicate-normalize.mjs";
import {
  findFunctionBlocks,
  findOptionCollections,
} from "./duplicate-source-blocks.mjs";

export function runDuplicateParserRegressionChecks(failures) {
  const duplicateBlocks = findFunctionBlocks(duplicateFunctionSource())
    .map((block) => ({
      ...block,
      file: "self-test.ts",
      key: normalizeImplementation(block.body),
    }))
    .filter(shouldTrackImplementation);
  assert(
    duplicateBlocks.length === 2 &&
      duplicateBlocks[0].key === duplicateBlocks[1].key,
    "duplicate function bodies should normalize to the same key",
  );

  const shortBlocks = findFunctionBlocks(
    "function shortHelper(value) { return value ?? null; }",
  )
    .map((block) => ({ ...block, key: normalizeImplementation(block.body) }))
    .filter(shouldTrackImplementation);
  assert(shortBlocks.length === 0, "short helpers should not be tracked");

  const optionCollections = findOptionCollections(`
    const statusOptions = [
      { value: "new", label: "Novo" },
      { value: "used", label: "Usado" },
      { value: "sold", label: "Vendido" },
    ];
  `)
    .map((collection) => ({
      ...collection,
      key: normalizeOptionCollection(collection.body),
    }))
    .filter(shouldTrackOptionCollection);
  assert(
    optionCollections.length === 1,
    "option collections should be tracked",
  );

  const windows = findFunctionBlocks(tokenCloneSource())
    .map((block) => ({ ...block, file: "self-test.ts" }))
    .flatMap(findCloneWindows);
  assert(
    new Set(windows.map((window) => window.owner)).size === 2,
    "token-window duplicate detection should track repeated internal blocks",
  );

  const originalFailureCount = failures.length;
  prepareDuplicateSource(
    "/* duplicate-implementation-allow: fixture parity */\nfunction a() {}",
    "self-test.ts",
    failures,
  );
  const bareAllowFailures = failures.slice(originalFailureCount);
  failures.length = originalFailureCount;
  assert(
    bareAllowFailures.length === 1,
    "bare allow markers should be rejected in favor of scoped markers",
  );
}

function duplicateFunctionSource() {
  return `
    function firstFormatter(input) {
      const normalized = input.trim().toLowerCase();
      const parts = normalized.split("-");
      const mapped = parts.map((part) => part.replace(/_/g, " "));
      const filtered = mapped.filter(Boolean);
      const joined = filtered.join(" ");
      const compacted = joined.replace(/\\s+/g, " ");
      const words = compacted.split(" ");
      const titled = words.map((word) => word.slice(0, 1).toUpperCase() + word.slice(1));
      const fallback = titled.join(" ").trim();
      const summary = { compacted, fallback, filtered, joined, mapped, normalized, parts, titled, words };
      const hasContent = summary.filtered.length > 0 && summary.words.length > 0;
      if (!hasContent) return null;
      return summary.fallback || null;
    }
    function secondFormatter(input) {
      const normalized = input.trim().toLowerCase();
      const parts = normalized.split("_");
      const mapped = parts.map((part) => part.replace(/-/g, " "));
      const filtered = mapped.filter(Boolean);
      const joined = filtered.join(" ");
      const compacted = joined.replace(/\\s+/g, " ");
      const words = compacted.split(" ");
      const titled = words.map((word) => word.slice(0, 1).toUpperCase() + word.slice(1));
      const fallback = titled.join(" ").trim();
      const summary = { compacted, fallback, filtered, joined, mapped, normalized, parts, titled, words };
      const hasContent = summary.filtered.length > 0 && summary.words.length > 0;
      if (!hasContent) return null;
      return summary.fallback || null;
    }
  `;
}

function tokenCloneSource() {
  const repeatedLines = Array.from(
    { length: 16 },
    (_, index) => `total += row.values[${index}];`,
  ).join("\n");
  return `
    function firstCalculator(row) {
      let total = 0;
      ${repeatedLines}
      return total;
    }
    function secondCalculator(row) {
      let total = 0;
      ${repeatedLines}
      return total;
    }
  `;
}

function assert(condition, label) {
  if (condition) return;
  console.error(`Duplicate implementation checker self-test failed: ${label}`);
  process.exit(1);
}
