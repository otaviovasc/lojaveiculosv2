import { spawnSync } from "node:child_process";
import postgres from "postgres";
import { assertKnownLocalDatabaseUrl } from "./local-database-safety.mjs";
import { installFinanceAutoEntryParity } from "./install-finance-auto-entry-parity.mjs";

assertKnownLocalDatabaseUrl("DATABASE_URL");

const force = process.argv.includes("--force");
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2";
const sql = postgres(databaseUrl, { max: 1 });

try {
  const tableState = await readAutomationTableState();
  if (tableState.count === tableState.expected) {
    await detachScopeForeignKeys();
    await ensureScopeIndexes();
  } else if (tableState.count !== 0) {
    throw new Error(
      `Automation schema is partially present (${tableState.count}/${tableState.expected} tables). Refusing an unsafe push.`,
    );
  }

  runDrizzlePush({ bootstrap: true });
  await installFinanceAutoEntryParity(sql);
  await verifyBootstrapState();
  await installScopeForeignKeys();
  await verifyFinalState();
} catch (error) {
  try {
    const tableState = await readAutomationTableState();
    if (tableState.count === tableState.expected) {
      await ensureScopeIndexes();
      await installScopeForeignKeys();
    }
  } catch (restoreError) {
    throw new AggregateError(
      [error, restoreError],
      "Product schema push failed and automation scope constraints could not be restored.",
    );
  }
  throw error;
} finally {
  await sql.end();
}

function runDrizzlePush({ bootstrap }) {
  const args = ["push"];
  if (force) args.push("--force");
  args.push("--config", "drizzle.config.ts");
  const result = spawnSync("drizzle-kit", args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...(bootstrap ? { DRIZZLE_AUTOMATION_BOOTSTRAP: "true" } : {}),
    },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["inherit", "inherit", "pipe"],
  });
  const stderr = result.stderr ?? "";
  if (stderr) process.stderr.write(stderr);
  if (result.error) throw result.error;
  if (stderr.includes("PostgresError:")) {
    throw new Error(
      `${bootstrap ? "Automation bootstrap" : "Final schema"} push reported a PostgreSQL error.`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `${bootstrap ? "Automation bootstrap" : "Final schema"} push exited with status ${String(result.status)}.`,
    );
  }
}

async function readAutomationTableState() {
  const expectedTables = [
    "automation_runs",
    "automation_steps",
    "automation_approvals",
  ];
  const rows = await sql`
    select relname
    from pg_class
    where relnamespace = 'public'::regnamespace
      and relkind = 'r'
      and relname in ${sql(expectedTables)}
  `;
  return { count: rows.length, expected: expectedTables.length };
}

async function ensureScopeIndexes() {
  const legacyConstraintNames = [
    "automation_runs_id_scope_unique",
    "automation_steps_id_run_scope_unique",
  ];
  const legacyConstraints = await sql`
    select conname
    from pg_constraint
    where contype = 'u'
      and conname in ${sql(legacyConstraintNames)}
  `;
  if (legacyConstraints.length) {
    await sql.unsafe(`
      ALTER TABLE "automation_steps"
        DROP CONSTRAINT IF EXISTS "automation_steps_id_run_scope_unique";
      ALTER TABLE "automation_runs"
        DROP CONSTRAINT IF EXISTS "automation_runs_id_scope_unique";
    `);
  }
  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "automation_runs_id_scope_unique"
      ON "automation_runs" ("id", "tenant_id", "store_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "automation_steps_id_run_scope_unique"
      ON "automation_steps" ("id", "run_id", "tenant_id", "store_id");
  `);
  console.log("Automation scope indexes are ready for Drizzle foreign keys.");
}

async function detachScopeForeignKeys() {
  await sql.begin(async (transaction) => {
    await transaction.unsafe(`
      ALTER TABLE "automation_approvals"
        DROP CONSTRAINT IF EXISTS "automation_approvals_step_run_scope_fk";
      ALTER TABLE "automation_steps"
        DROP CONSTRAINT IF EXISTS "automation_steps_run_scope_fk";
    `);
  });
}

async function installScopeForeignKeys() {
  await sql.begin(async (transaction) => {
    await transaction.unsafe(`
      ALTER TABLE "automation_approvals"
        DROP CONSTRAINT IF EXISTS "automation_approvals_step_run_scope_fk";
      ALTER TABLE "automation_steps"
        DROP CONSTRAINT IF EXISTS "automation_steps_run_scope_fk";
      ALTER TABLE "automation_steps"
        ADD CONSTRAINT "automation_steps_run_scope_fk"
        FOREIGN KEY ("run_id", "tenant_id", "store_id")
        REFERENCES "automation_runs" ("id", "tenant_id", "store_id")
        ON DELETE CASCADE;
      ALTER TABLE "automation_approvals"
        ADD CONSTRAINT "automation_approvals_step_run_scope_fk"
        FOREIGN KEY ("step_id", "run_id", "tenant_id", "store_id")
        REFERENCES "automation_steps" ("id", "run_id", "tenant_id", "store_id")
        ON DELETE CASCADE;
    `);
  });
}

async function verifyBootstrapState() {
  const tableState = await readAutomationTableState();
  if (tableState.count !== tableState.expected) {
    throw new Error("Automation bootstrap did not create every table.");
  }
  const expectedIndexes = [
    "automation_runs_id_scope_unique",
    "automation_steps_id_run_scope_unique",
  ];
  const rows = await sql`
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and indexname in ${sql(expectedIndexes)}
  `;
  const actual = new Set(rows.map((row) => row.indexname));
  const missing = expectedIndexes.filter((name) => !actual.has(name));
  if (missing.length) {
    throw new Error(
      `Automation bootstrap scope indexes are missing: ${missing.join(", ")}`,
    );
  }
  console.log("Automation bootstrap tables and scope indexes verified.");
}

async function verifyFinalState() {
  const expectedConstraints = [
    "automation_approvals_decision_actor_consistent",
    "automation_approvals_proposal_digest_sha256",
    "automation_approvals_step_run_scope_fk",
    "automation_steps_run_scope_fk",
  ];
  const rows = await sql`
    select conname
    from pg_constraint
    where conname in ${sql(expectedConstraints)}
  `;
  const actual = new Set(rows.map((row) => row.conname));
  const missing = expectedConstraints.filter((name) => !actual.has(name));
  if (missing.length) {
    throw new Error(
      `Automation scope constraints are missing after db push: ${missing.join(", ")}`,
    );
  }
  const expectedIndexes = [
    "automation_runs_id_scope_unique",
    "automation_steps_id_run_scope_unique",
  ];
  const indexRows = await sql`
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and indexname in ${sql(expectedIndexes)}
  `;
  const actualIndexes = new Set(indexRows.map((row) => row.indexname));
  const missingIndexes = expectedIndexes.filter(
    (name) => !actualIndexes.has(name),
  );
  if (missingIndexes.length) {
    throw new Error(
      `Automation scope indexes are missing after db push: ${missingIndexes.join(", ")}`,
    );
  }
  console.log("Automation scope constraints verified in the local product DB.");
}
