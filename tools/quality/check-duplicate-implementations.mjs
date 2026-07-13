import { join } from "node:path";
import { prepareDuplicateSource } from "./duplicate-allow-markers.mjs";
import {
  blockAllowEndMarker,
  blockAllowStartMarker,
  maximumReportedGroups,
} from "./duplicate-config.mjs";
import {
  findCloneWindows,
  normalizeImplementation,
  normalizeOptionCollection,
  shouldTrackImplementation,
  shouldTrackOptionCollection,
} from "./duplicate-normalize.mjs";
import {
  reportDuplicateCloneWindows,
  reportDuplicateGroups,
} from "./duplicate-reporting.mjs";
import { runDuplicateParserRegressionChecks } from "./duplicate-self-tests.mjs";
import {
  extensionOf,
  readText,
  repoPath,
  repoRoot,
  walkFiles,
} from "./quality-files.mjs";
import {
  findFunctionBlocks,
  findOptionCollections,
} from "./duplicate-source-blocks.mjs";

const sourceRoots = ["apps", "packages"].map((path) => join(repoRoot, path));
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const failures = [];

runDuplicateParserRegressionChecks(failures);

const implementationBlocks = [];
const optionCollections = [];
const cloneWindows = [];

for (const file of walkFiles(sourceRoots, { extensions: sourceExtensions })) {
  if (!isScannedSourceFile(file)) continue;

  const rel = repoPath(file);
  const preparedSource = prepareDuplicateSource(readText(file), rel, failures);
  if (!preparedSource) continue;

  const functionBlocks = findFunctionBlocks(preparedSource, rel).map(
    (block) => ({
      ...block,
      file: rel,
    }),
  );

  implementationBlocks.push(
    ...functionBlocks
      .map((block) => ({
        ...block,
        key: normalizeImplementation(block.body),
      }))
      .filter(shouldTrackImplementation),
  );

  cloneWindows.push(...functionBlocks.flatMap(findCloneWindows));

  optionCollections.push(
    ...findOptionCollections(preparedSource)
      .map((collection) => ({
        ...collection,
        file: rel,
        key: normalizeOptionCollection(collection.body),
      }))
      .filter(shouldTrackOptionCollection),
  );
}

reportDuplicateGroups({
  failures,
  items: implementationBlocks,
  label: "implementation",
  suggestion:
    "Move the shared logic to a service/helper/component primitive and call it from each feature.",
});
reportDuplicateGroups({
  failures,
  items: optionCollections,
  label: "option collection",
  suggestion:
    "Move repeated option data to a shared feature model or UI control wrapper.",
});
reportDuplicateCloneWindows(cloneWindows, failures);

if (failures.length > 0) {
  console.error("Duplicate implementation guardrail violations:");
  for (const failure of failures.slice(0, maximumReportedGroups)) {
    console.error(`- ${failure}`);
  }
  const hiddenCount = failures.length - maximumReportedGroups;
  if (hiddenCount > 0) {
    console.error(`- ${hiddenCount} more duplicate groups not shown`);
  }
  console.error(
    `Centralize the duplicated code, or use ${blockAllowStartMarker}: <reason> / ${blockAllowEndMarker} around a narrow intentional exception.`,
  );
  process.exit(1);
}

console.log("Duplicate implementation guardrails passed.");

function isScannedSourceFile(file) {
  if (!sourceExtensions.has(extensionOf(file))) return false;

  const rel = repoPath(file);
  if (!rel.includes("/src/")) return false;
  if (/\.d\.ts$/.test(rel)) return false;
  if (/\.(test|spec|stories)\.[jt]sx?$/.test(rel)) return false;
  if (
    /(^|\/)(__fixtures__|__mocks__|__tests__|fixtures|mocks)(\/|$)/.test(rel)
  ) {
    return false;
  }
  if (/(^|\/)[^/]*(?:fixture|testSupport)[^/]*\.[jt]sx?$/.test(rel)) {
    return false;
  }
  if (/(^|\/)(schema|migrations)\//.test(rel)) return false;

  return true;
}
