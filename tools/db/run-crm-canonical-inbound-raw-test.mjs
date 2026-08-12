import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const containerName = `lojaveiculosv2-crm-canonical-${process.pid}-${Date.now()}`;
const sourceContainerName = "lojaveiculosv2-postgres";
const databaseName = "crm_canonical_inbound_test";
const databaseUser = "crm_canonical_test";
const databasePassword = "crm_canonical_test";
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
let databaseUrl;
let stopped = false;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopDatabase();
    process.exit(1);
  });
}

try {
  requireCommand("docker");
  startDatabase();
  databaseUrl = await waitForDatabase();
  await prepareBaseSchema();
  await applyCanonicalMigrations();
  await seedScope(databaseUrl);
  runCanonicalInboundTest(databaseUrl);
} finally {
  stopDatabase();
}

function requireCommand(command) {
  const result = spawnSync(command, ["--version"], { stdio: "ignore" });
  if (result.error)
    throw new Error(`${command} is required for this disposable DB test.`);
}

function startDatabase() {
  const result = spawnSync(
    "docker",
    [
      "run",
      "--detach",
      "--name",
      containerName,
      "--publish",
      "127.0.0.1::5432",
      "--env",
      `POSTGRES_DB=${databaseName}`,
      "--env",
      `POSTGRES_USER=${databaseUser}`,
      "--env",
      `POSTGRES_PASSWORD=${databasePassword}`,
      "postgres:16-alpine",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.status !== 0) {
    throw new Error(`Unable to start disposable PostgreSQL: ${result.stderr}`);
  }
}

async function waitForDatabase() {
  const port = readMappedPort();
  const url = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${port}/${databaseName}`;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const sql = postgres(url, { max: 1, connect_timeout: 1 });
    try {
      await sql`select 1`;
      await sql.end();
      return url;
    } catch (error) {
      await sql.end({ timeout: 1 }).catch(() => undefined);
      if (attempt === 59) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error("Disposable PostgreSQL did not become ready.");
}

function readMappedPort() {
  const result = spawnSync("docker", ["port", containerName, "5432/tcp"], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `Unable to read disposable PostgreSQL port: ${result.stderr}`,
    );
  }
  const match = result.stdout.match(/:(\d+)\s*$/m);
  if (!match) throw new Error("Disposable PostgreSQL port was not published.");
  return match[1];
}

async function prepareBaseSchema() {
  runPsql(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lojaveiculosv2') THEN
        CREATE ROLE lojaveiculosv2;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lojaveiculosv2_audit') THEN
        CREATE ROLE lojaveiculosv2_audit;
      END IF;
    END $$;
  `);
  const dump = spawnSync(
    "docker",
    [
      "exec",
      sourceContainerName,
      "pg_dump",
      "-U",
      "lojaveiculosv2",
      "--schema-only",
      "lojaveiculosv2",
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (dump.status !== 0) {
    throw new Error(
      "The local lojaveiculosv2-postgres container is required for the base schema dump.",
    );
  }
  runPsql(dump.stdout);
}

async function applyCanonicalMigrations() {
  const migrations = [
    "0031_crm_core_canonical.sql",
    "0032_external_bot_runtime.sql",
    "0033_crm_retention.sql",
    "0034_crm_retention_security.sql",
    "0035_crm_core_semantic_integrity.sql",
    "0036_crm_external_bot_retention.sql",
    "0037_crm_core_provider_consent_integrity.sql",
    "0038_crm_core_sensitive_permissions.sql",
    "0039_crm_contact_identity_candidates.sql",
    "0040_crm_legacy_retention_window.sql",
    "0041_crm_retention_reconciliation_and_receipts.sql",
    "0042_provider_connection_identity_boundaries.sql",
    "0043_provider_event_payload_digest.sql",
    "0044_outbound_failure_classification.sql",
  ];
  runPsql(`
    INSERT INTO role_templates (id, description, is_system, name, role_key)
    VALUES
      ('11111111-1111-4111-8111-111111111111', 'Platform admin', true, 'Admin', 'admin'),
      ('22222222-2222-4222-8222-222222222222', 'Agency admin', true, 'Agency', 'agency'),
      ('55555555-5555-4555-8555-555555555555', 'Store owner', true, 'Owner', 'owner')
    ON CONFLICT (id) DO NOTHING;
  `);
  for (const migration of migrations) {
    const sql = await readFile(
      new URL(`../../packages/db/migrations/${migration}`, import.meta.url),
      "utf8",
    );
    runPsql(sql);
  }
}

function runPsql(input) {
  const result = spawnSync(
    "docker",
    [
      "exec",
      "--interactive",
      containerName,
      "psql",
      "-U",
      databaseUser,
      "-d",
      databaseName,
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
  if (result.status !== 0) {
    const detail = result.stderr.trim().split("\n").slice(-5).join(" ");
    throw new Error(
      `Disposable PostgreSQL schema preparation failed: ${detail}`,
    );
  }
}

async function seedScope(url) {
  const sql = postgres(url, { max: 1 });
  try {
    await sql.unsafe(`
      INSERT INTO tenants (id, legal_name, slug, trading_name)
      VALUES ('77777777-7777-4777-8777-777777777777', 'Canonical Test Tenant', 'canonical-test-tenant', 'Canonical Test Tenant')
      ON CONFLICT (id) DO NOTHING;
      INSERT INTO stores (id, public_slug, tenant_id, trading_name)
      VALUES ('66666666-6666-4666-8666-666666666666', 'canonical-test-store', '77777777-7777-4777-8777-777777777777', 'Canonical Test Store')
      ON CONFLICT (id) DO NOTHING;
    `);
  } finally {
    await sql.end();
  }
}

function runCanonicalInboundTest(url) {
  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      "@lojaveiculosv2/api",
      "exec",
      "vitest",
      "run",
      "src/infrastructure/db/crm/drizzleCrmCanonicalInbound.rawDb.test.ts",
      "src/infrastructure/db/crm/drizzleExternalBotEffectRuntime.rawDb.test.ts",
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        CI: "true",
        DATABASE_URL: url,
        RUN_RAW_CRM_DB_TESTS: "true",
      },
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    throw new Error("Canonical CRM disposable DB tests failed.");
  }
}

function stopDatabase() {
  if (stopped) return;
  stopped = true;
  spawnSync("docker", ["rm", "--force", containerName], { stdio: "ignore" });
}
