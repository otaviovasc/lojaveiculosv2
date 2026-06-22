import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { readBoard, repoRoot } from "./board-utils.mjs";

const args = parseArgs();
const board = readBoard();
const slice = board.slices.find((item) => item.id === args.slice);

if (!slice) die(`Unknown slice: ${args.slice}`);
if (!existsSync("/usr/bin/obscura"))
  die("Obscura not found at /usr/bin/obscura");

const baseUrl = args.url ?? "http://localhost:5173";
const routes = slice.qa?.visual?.routes ?? [];
if (routes.length === 0) die(`${slice.id} has no qa.visual.routes`);

const reportDir = join(repoRoot, "reports/visual", slice.id);
mkdirSync(reportDir, { recursive: true });

let failures = 0;
for (const route of routes) {
  const url = new URL(route, baseUrl).toString();
  const safeName = route.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  const output = fetchRendered(url, "text");
  const textPath = join(reportDir, `${safeName || "root"}.txt`);
  writeFileSync(textPath, output);

  const lower = output.toLowerCase();
  const bad =
    output.trim().length < 40 ||
    lower.includes("404") ||
    lower.includes("uncaught error") ||
    lower.includes("failed to fetch") ||
    lower.includes("sign in");

  if (bad) {
    console.error(`Visual QA suspicious for ${url}. See ${textPath}`);
    failures += 1;
  } else {
    console.log(`Visual QA ok: ${url} -> ${textPath}`);
  }
}

if (failures > 0) process.exit(1);
console.log(`Visual QA report: ${reportDir}`);

function fetchRendered(url, dump) {
  const result = spawnSync(
    "/usr/bin/obscura",
    ["fetch", "--allow-private-network", "--wait", "3", "--dump", dump, url],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    die(result.stderr || result.stdout || `Obscura failed for ${url}`);
  }

  return result.stdout;
}

function parseArgs() {
  const parsed = {};
  for (let index = 2; index < process.argv.length; index += 1) {
    if (process.argv[index] === "--slice") parsed.slice = process.argv[++index];
    if (process.argv[index] === "--url") parsed.url = process.argv[++index];
  }
  if (!parsed.slice) {
    die(
      "Usage: npm run qa:visual -- --slice <id> [--url http://localhost:5173]",
    );
  }
  return parsed;
}

function die(message) {
  console.error(message);
  process.exit(1);
}
