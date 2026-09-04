import { spawnSync } from "node:child_process";
import { assertSafeLocalDatabaseOperation } from "../../db/local-database-safety.mjs";

const productDatabaseUrl =
  "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2";
const auditDatabaseUrl =
  "postgresql://lojaveiculosv2_audit:lojaveiculosv2_audit_dev@localhost:54322/lojaveiculosv2_audit";

Object.assign(process.env, {
  APP_ENV: "local",
  ASAAS_API_KEY: "",
  AUDIT_DATABASE_URL: auditDatabaseUrl,
  CRM_ZAPI_CONNECTION_FILE: "",
  DATABASE_URL: productDatabaseUrl,
  R2_ACCESS_KEY_ID: "",
  R2_BUCKET_NAME: "",
  R2_ENDPOINT: "",
  R2_PUBLIC_BASE_URL: "",
  R2_SECRET_ACCESS_KEY: "",
  R2_SEED_WRITE_BUCKET: "",
  REDIS_URL: "redis://localhost:63790",
});

assertSafeLocalDatabaseOperation("crm:composio:prepare:local");

run("pnpm", ["run", "db:up"]);
run("pnpm", ["run", "db:push:local"]);
run("pnpm", ["run", "db:seed:sql:local"]);
run("node", ["tools/qa/local-seed-smoke.mjs"]);

console.info(
  "Local CRM seed is ready. Diagnose/link Composio, then run crm:composio:seed:local.",
);

function run(command, args) {
  const result = spawnSync(command, args, {
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed.`);
  }
}
