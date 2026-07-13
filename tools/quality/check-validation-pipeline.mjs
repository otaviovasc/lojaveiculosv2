import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { findValidationPipelineViolations } from "./validation-pipeline-rules.mjs";

const root = new URL("../../", import.meta.url).pathname;
const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const qualityCheckFiles = readdirSync(join(root, "tools/quality"))
  .filter((file) => /^check-[a-z0-9-]+\.mjs$/.test(file))
  .map((file) => `tools/quality/${file}`)
  .sort();
const fileSources = Object.fromEntries(
  [".husky/pre-commit", ".husky/pre-push", ".github/workflows/ci.yml"].map(
    (file) => [file, readIfPresent(file)],
  ),
);
const fileModes = Object.fromEntries(
  [".husky/pre-commit", ".husky/pre-push"].map((file) => [
    file,
    modeIfPresent(file),
  ]),
);
const failures = findValidationPipelineViolations({
  fileModes,
  fileSources,
  lintStaged: packageJson["lint-staged"],
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

function readIfPresent(file) {
  return existsSync(join(root, file)) ? read(file) : "";
}

function modeIfPresent(file) {
  return existsSync(join(root, file)) ? statSync(join(root, file)).mode : 0;
}
