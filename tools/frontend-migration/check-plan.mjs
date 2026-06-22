import { readFileSync } from "node:fs";
import { planPath, readBoard } from "./board-utils.mjs";
import { renderFormatted } from "./render-plan.mjs";

const expected = await renderFormatted(readBoard());
const current = readFileSync(planPath, "utf8");

if (current !== expected) {
  console.error("v2-plan.html is stale. Run npm run migration:render-plan.");
  process.exit(1);
}

console.log("v2-plan.html is in sync with board.json.");
