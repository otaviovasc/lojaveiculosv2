import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const ignored = new Set([
  ".git",
  ".worktrees",
  "build",
  "dist",
  "node_modules",
]);
const expectedTemplateKeys = [
  "commission_seller_report",
  "consignment_contract",
  "delivery_term",
  "finance_entry_receipt",
  "financial_report",
  "internal_invoice_control",
  "owner_summary_report",
  "reservation_receipt",
  "sale_contract",
  "sale_contract_as_is",
  "sale_receipt",
  "test_drive_term",
  "trade_in_power_of_attorney",
  "used_vehicle_warranty",
  "vehicle_checklist",
  "vehicle_checklist_summary",
];
const allowedReactPdfPrefix = "apps/api/src/domains/documents/render/reactPdf";

const files = walk(root).filter((file) => /\.(ts|tsx)$/.test(file));
const violations = [];

for (const file of files) {
  const relativePath = relative(root, file);
  const source = readFileSync(file, "utf8");
  if (
    source.includes("@react-pdf/renderer") &&
    !relativePath.startsWith(allowedReactPdfPrefix)
  ) {
    violations.push(
      `${relativePath}: import React PDF through shared document render primitives.`,
    );
  }
  if (
    relativePath.startsWith("apps/api/src/domains/vehicle/documents/") &&
    source.includes('renderer: "pdf-lib"')
  ) {
    violations.push(`${relativePath}: vehicle documents must use react-pdf.`);
  }
}

const catalogSource = readFileSync(
  join(root, "packages/documents/src/types.ts"),
  "utf8",
);
for (const key of expectedTemplateKeys) {
  if (!catalogSource.includes(`"${key}"`)) {
    violations.push(`packages/documents/src/types.ts: missing ${key}.`);
  }
}

if (violations.length > 0) {
  console.error("Document guardrail violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

function walk(dir, result = []) {
  for (const entry of readdirSync(dir)) {
    if (ignored.has(entry)) continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, result);
    else result.push(path);
  }
  return result;
}
