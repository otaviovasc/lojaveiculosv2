import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findValidationPipelineViolations } from "./validation-pipeline-rules.mjs";

const root = new URL("../../", import.meta.url).pathname;
const scripts = JSON.parse(read("package.json")).scripts ?? {};
const qualityCheckFiles = readdirSync(join(root, "tools/quality"))
  .filter((file) => /^check-[a-z0-9-]+\.mjs$/.test(file))
  .map((file) => `tools/quality/${file}`)
  .sort();
const fileSources = Object.fromEntries(
  [".husky/pre-commit", ".husky/pre-push", ".github/workflows/ci.yml"].map(
    (file) => [file, read(file)],
  ),
);
const failures = findValidationPipelineViolations({
  fileSources,
  qualityCheckFiles,
  scripts,
});

if (failures.length > 0) {
  console.error("Validation pipeline violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

function read(file) {
  return readFileSync(join(root, file), "utf8");
}
