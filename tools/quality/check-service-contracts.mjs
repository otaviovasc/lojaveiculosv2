import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const domainsRoot = new URL("../../apps/api/src/domains", import.meta.url)
  .pathname;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      walk(path, files);
    } else if (path.endsWith(".ts") && !path.endsWith(".test.ts")) {
      files.push(path);
    }
  }

  return files;
}

function isServiceFile(file) {
  const fileName = basename(file);
  return (
    file.includes("/services/") &&
    fileName !== "auditVehicleServiceEvent.ts" &&
    fileName !== "index.ts" &&
    fileName !== "serviceSupport.ts" &&
    fileName !== "testSupport.ts" &&
    fileName !== "types.ts"
  );
}

const failures = [];

for (const file of walk(domainsRoot).filter(isServiceFile)) {
  const source = readFileSync(file, "utf8");
  const isContextResolver = source.includes("resolvePermissions(");

  if (!source.includes("ServiceContext") && !isContextResolver) {
    failures.push(`${file}: service entrypoint must accept ServiceContext`);
  }

  if (!source.includes("assertPermission(") && !isContextResolver) {
    failures.push(`${file}: service must enforce at least one permission`);
  }

  if (
    !source.includes("context.audit.record(") &&
    !source.includes("input.audit.record(") &&
    !source.includes("auditFinanceServiceEvent(") &&
    !source.includes("auditSalesServiceEvent(") &&
    !source.includes("auditVehicleServiceEvent(")
  ) {
    failures.push(`${file}: service must emit an audit event`);
  }

  if (
    !source.includes("context.logger.") &&
    !source.includes("input.logger.") &&
    !source.includes("logFinanceServiceEvent(") &&
    !source.includes("logSalesServiceEvent(") &&
    !source.includes("logVehicleServiceEvent(")
  ) {
    failures.push(`${file}: service must write scoped structured logs`);
  }
}

if (failures.length > 0) {
  console.error("Service contract violations:");
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}
