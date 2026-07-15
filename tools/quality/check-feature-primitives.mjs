import { join } from "node:path";
import { readText, repoPath, repoRoot, walkFiles } from "./quality-files.mjs";
import {
  findFeaturePrimitiveViolations,
  findFeatureSectionContractViolations,
} from "./feature-primitive-rules.mjs";

const featuresRoot = join(repoRoot, "apps/web/src/features");
const allowMarker = "feature-primitives-allow-local";
const allowMarkerPattern = /feature-primitives-allow-local:\s+\S(?:.*\S)?/;
const failures = [];
const featureLayout = join(
  repoRoot,
  "apps/web/src/components/ui/FeatureLayout.tsx",
);

for (const violation of findFeatureSectionContractViolations(
  readText(featureLayout),
)) {
  failures.push(
    `${repoPath(featureLayout)} ${violation.name}: ${violation.suggestion}.`,
  );
}

for (const file of walkFiles(featuresRoot, { extensions: new Set([".tsx"]) })) {
  const source = readText(file);
  if (source.includes(allowMarker)) {
    if (allowMarkerPattern.test(source)) continue;
    failures.push(
      `${repoPath(file)} uses ${allowMarker} without a short reason. Use ${allowMarker}: <reason>.`,
    );
    continue;
  }

  for (const violation of findFeaturePrimitiveViolations(file, source)) {
    const verb = violation.verb ?? "declares";
    failures.push(
      `${repoPath(file)}:${violation.line} ${verb} ${violation.name}: ${violation.suggestion}.`,
    );
  }
}

if (failures.length > 0) {
  console.error("Feature primitive guardrail violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error(
    "Use apps/web/src/components/ui feature primitives, add a primitive variant, or add feature-primitives-allow-local: <reason> for a narrow exception.",
  );
  process.exit(1);
}

console.log("Feature primitive guardrails passed.");
