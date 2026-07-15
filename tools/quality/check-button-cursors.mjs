import { join } from "node:path";
import { findButtonCursorContractViolations } from "./button-cursor-rules.mjs";
import { readText, repoRoot } from "./quality-files.mjs";

const violations = findButtonCursorContractViolations({
  cursorCss: readText(join(repoRoot, "apps/web/src/styles/button-cursors.css")),
  globalCss: readText(join(repoRoot, "apps/web/src/styles/global.css")),
  mainSource: readText(join(repoRoot, "apps/web/src/main.tsx")),
});

if (violations.length > 0) {
  console.error("Button cursor guardrail violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("Button cursor guardrails passed.");
