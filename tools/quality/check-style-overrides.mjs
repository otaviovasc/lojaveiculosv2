import { join } from "node:path";
import { readText, repoPath, repoRoot, walkFiles } from "./quality-files.mjs";
import { findStyleOverrideViolations } from "./style-override-rules.mjs";

const webRoot = join(repoRoot, "apps/web/src");
const extensions = new Set([".ts", ".tsx"]);
const failures = walkFiles(webRoot, { extensions }).flatMap((file) =>
  findStyleOverrideViolations(file, readText(file)).map(
    ({ tagName, cls, kind, line }) => {
      return `${repoPath(file)}:${line}: Style override detected on component <${tagName}>: "${cls}" (${kind}). UI component styling must not be overridden.`;
    },
  ),
);

if (failures.length > 0) {
  console.error("Style override violations:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Style override guardrails passed.");
