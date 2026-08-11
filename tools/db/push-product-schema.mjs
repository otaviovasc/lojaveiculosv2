import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import { assertKnownLocalDatabaseUrl } from "./local-database-safety.mjs";
import { installCrmWhatsappSessionIdentityParity } from "./install-crm-whatsapp-session-identity-parity.mjs";
import { installFinanceAutoEntryParity } from "./install-finance-auto-entry-parity.mjs";
import { installFiscalCatalogParity } from "./install-fiscal-catalog-parity.mjs";

export const billingScopeForeignKeyNames = [
  "billing_addon_contracts_item_scope_fk",
  "billing_addon_contracts_payment_scope_fk",
  "billing_addon_contracts_store_tenant_fk",
  "billing_addon_contracts_subscription_tenant_fk",
  "billing_provider_reconciliations_subscription_tenant_fk",
];

export const billingScopeIndexNames = [
  "payments_scoped_identity_unique",
  "subscription_items_scoped_identity_unique",
  "subscriptions_id_tenant_unique",
];

export const crmScopeForeignKeyNames = [
  "crm_connections_store_tenant_fk",
  "provider_events_store_tenant_fk",
  "provider_events_scoped_connection_fk",
  "crm_whatsapp_sessions_scoped_connection_fk",
  "crm_whatsapp_messages_scoped_session_fk",
  "crm_whatsapp_outbound_intents_scoped_connection_fk",
  "crm_whatsapp_outbound_intents_scoped_session_fk",
  "crm_whatsapp_outbound_intents_scoped_message_fk",
  "crm_whatsapp_intervention_ledger_scoped_connection_fk",
  "crm_whatsapp_intervention_ledger_scoped_session_fk",
  "crm_webhook_effect_outbox_scoped_provider_event_fk",
  "crm_webhook_effect_outbox_scoped_connection_fk",
  "crm_webhook_effect_outbox_scoped_session_fk",
  "crm_webhook_effect_outbox_scoped_message_fk",
];

export const crmScopeIndexNames = [
  "stores_id_tenant_unique",
  "crm_connections_scope_id_unique",
  "crm_whatsapp_sessions_scope_connection_id_unique",
  "crm_whatsapp_messages_scope_connection_session_id_unique",
  "provider_events_scope_id_unique",
];

let force = false;
let sql;

if (isMainModule()) {
  await main();
}

async function main() {
  assertKnownLocalDatabaseUrl("DATABASE_URL");
  force = process.argv.includes("--force");
  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2";
  sql = postgres(databaseUrl, { max: 1 });

  try {
    await pushProductSchema();
  } finally {
    await sql.end();
  }
}

export async function pushProductSchema({
  detachScopeForeignKeys: detachForeignKeys = detachScopeForeignKeys,
  ensureAutomationScopeIndexes:
    ensureAutomationIndexes = ensureAutomationScopeIndexes,
  ensureBillingScopeIndexes: ensureBillingIndexes = ensureBillingScopeIndexes,
  ensureCrmScopeIndexes: ensureCrmIndexes = ensureCrmScopeIndexes,
  ensureFinancingScopeIndexes:
    ensureFinancingIndexes = ensureFinancingScopeIndexes,
  installCrmWhatsappSessionIdentityParity:
    installCrmParity = installCrmWhatsappSessionIdentityParity,
  installFinanceAutoEntryParity:
    installFinanceParity = installFinanceAutoEntryParity,
  installFiscalCatalogParity: installFiscalParity = installFiscalCatalogParity,
  installScopeForeignKeys: installForeignKeys = installScopeForeignKeys,
  readAutomationTableState: readTableState = readAutomationTableState,
  runDrizzlePush: runPush = runDrizzlePush,
  verifyBootstrapState: verifyBootstrap = verifyBootstrapState,
  verifyFinalState: verifyFinal = verifyFinalState,
} = {}) {
  try {
    const tableState = await readTableState();
    if (tableState.count === tableState.expected) {
      await detachForeignKeys();
      await ensureAutomationIndexes();
      await ensureCrmIndexes();
    } else if (tableState.count !== 0) {
      throw new Error(
        `Automation schema is partially present (${tableState.count}/${tableState.expected} tables). Refusing an unsafe push.`,
      );
    }

    await runPush({ bootstrap: true });
    await installCrmParity(sql);
    await installFinanceParity(sql);
    await installFiscalParity(sql);
    await ensureAutomationIndexes();
    await ensureCrmIndexes();
    await ensureFinancingIndexes();
    await ensureBillingIndexes();
    await verifyBootstrap();
    await installForeignKeys();
    await verifyFinal();
  } catch (error) {
    try {
      const tableState = await readTableState();
      if (tableState.count === tableState.expected) {
        await ensureAutomationIndexes();
        await ensureCrmIndexes();
        await ensureFinancingIndexes();
        await ensureBillingIndexes();
        await installForeignKeys();
      }
    } catch (restoreError) {
      throw new AggregateError(
        [error, restoreError],
        "Product schema push failed and scope constraints could not be restored.",
      );
    }
    throw error;
  }
}

function isMainModule() {
  return Boolean(
    process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url,
  );
}

function runDrizzlePush({ bootstrap }) {
  const args = ["push"];
  if (force) args.push("--force");
  args.push("--config", "drizzle.config.ts");
  const result = spawnSync("drizzle-kit", args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...(bootstrap
        ? {
            DRIZZLE_AUTOMATION_BOOTSTRAP: "true",
            DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP: "true",
          }
        : {}),
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
      `${bootstrap ? "Scoped foreign-key bootstrap" : "Final schema"} push reported a PostgreSQL error.`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `${bootstrap ? "Scoped foreign-key bootstrap" : "Final schema"} push exited with status ${String(result.status)}.`,
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

async function ensureAutomationScopeIndexes() {
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
      ALTER TABLE IF EXISTS "crm_whatsapp_outbound_intents"
        DROP CONSTRAINT IF EXISTS "crm_whatsapp_outbound_intents_scoped_message_fk",
        DROP CONSTRAINT IF EXISTS "crm_whatsapp_outbound_intents_scoped_session_fk",
        DROP CONSTRAINT IF EXISTS "crm_whatsapp_outbound_intents_scoped_connection_fk";
      ALTER TABLE IF EXISTS "crm_whatsapp_intervention_ledger"
        DROP CONSTRAINT IF EXISTS "crm_whatsapp_intervention_ledger_scoped_session_fk",
        DROP CONSTRAINT IF EXISTS "crm_whatsapp_intervention_ledger_scoped_connection_fk";
      ALTER TABLE IF EXISTS "crm_webhook_effect_outbox"
        DROP CONSTRAINT IF EXISTS "crm_webhook_effect_outbox_scoped_message_fk",
        DROP CONSTRAINT IF EXISTS "crm_webhook_effect_outbox_scoped_session_fk",
        DROP CONSTRAINT IF EXISTS "crm_webhook_effect_outbox_scoped_connection_fk",
        DROP CONSTRAINT IF EXISTS "crm_webhook_effect_outbox_scoped_provider_event_fk";
      ALTER TABLE IF EXISTS "provider_events"
        DROP CONSTRAINT IF EXISTS "provider_events_scoped_connection_fk",
        DROP CONSTRAINT IF EXISTS "provider_events_store_tenant_fk";
      ALTER TABLE IF EXISTS "crm_whatsapp_messages"
        DROP CONSTRAINT IF EXISTS "crm_whatsapp_messages_scoped_session_fk";
      ALTER TABLE IF EXISTS "crm_whatsapp_sessions"
        DROP CONSTRAINT IF EXISTS "crm_whatsapp_sessions_scoped_connection_fk";
      ALTER TABLE IF EXISTS "crm_connections"
        DROP CONSTRAINT IF EXISTS "crm_connections_store_tenant_fk";
      ALTER TABLE IF EXISTS "billing_provider_reconciliations"
        DROP CONSTRAINT IF EXISTS "billing_provider_reconciliations_subscription_tenant_fk";
      ALTER TABLE IF EXISTS "billing_addon_contracts"
        DROP CONSTRAINT IF EXISTS "billing_addon_contracts_item_scope_fk",
        DROP CONSTRAINT IF EXISTS "billing_addon_contracts_payment_scope_fk",
        DROP CONSTRAINT IF EXISTS "billing_addon_contracts_store_tenant_fk",
        DROP CONSTRAINT IF EXISTS "billing_addon_contracts_subscription_tenant_fk";
      ALTER TABLE IF EXISTS "financing_inquiry_events"
        DROP CONSTRAINT IF EXISTS "financing_inquiry_events_operation_scope_fk",
        DROP CONSTRAINT IF EXISTS "financing_inquiry_events_inquiry_scope_fk";
      ALTER TABLE IF EXISTS "financing_conditions"
        DROP CONSTRAINT IF EXISTS "financing_conditions_inquiry_scope_fk";
      ALTER TABLE IF EXISTS "financing_operation_requests"
        DROP CONSTRAINT IF EXISTS "financing_operation_requests_inquiry_scope_fk",
        DROP CONSTRAINT IF EXISTS "financing_operation_requests_consent_scope_fk",
        DROP CONSTRAINT IF EXISTS "financing_operation_requests_mapping_scope_fk",
        DROP CONSTRAINT IF EXISTS "financing_operation_requests_account_scope_fk";
      ALTER TABLE IF EXISTS "financing_inquiries"
        DROP CONSTRAINT IF EXISTS "financing_inquiries_consent_scope_fk",
        DROP CONSTRAINT IF EXISTS "financing_inquiries_mapping_scope_fk",
        DROP CONSTRAINT IF EXISTS "financing_inquiries_account_scope_fk";
      ALTER TABLE IF EXISTS "financing_customer_consents"
        DROP CONSTRAINT IF EXISTS "financing_customer_consents_store_scope_fk";
      ALTER TABLE IF EXISTS "financing_provider_store_banks"
        DROP CONSTRAINT IF EXISTS "financing_provider_store_banks_mapping_scope_fk";
      ALTER TABLE IF EXISTS "financing_provider_store_mappings"
        DROP CONSTRAINT IF EXISTS "financing_provider_store_mappings_store_scope_fk",
        DROP CONSTRAINT IF EXISTS "financing_provider_store_mappings_account_scope_fk";
      ALTER TABLE IF EXISTS "provider_oauth_transactions"
        DROP CONSTRAINT IF EXISTS "provider_oauth_transactions_account_scope_fk";
      ALTER TABLE IF EXISTS "financing_provider_tokens"
        DROP CONSTRAINT IF EXISTS "financing_provider_tokens_account_scope_fk";
    `);
  });
}

async function ensureCrmScopeIndexes() {
  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "stores_id_tenant_unique"
      ON "stores" ("id", "tenant_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "crm_connections_scope_id_unique"
      ON "crm_connections" ("tenant_id", "store_id", "id");
    CREATE UNIQUE INDEX IF NOT EXISTS "crm_whatsapp_sessions_scope_connection_id_unique"
      ON "crm_whatsapp_sessions" ("tenant_id", "store_id", "connection_id", "id");
    CREATE UNIQUE INDEX IF NOT EXISTS "crm_whatsapp_messages_scope_connection_session_id_unique"
      ON "crm_whatsapp_messages" ("tenant_id", "store_id", "connection_id", "session_id", "id");
    CREATE UNIQUE INDEX IF NOT EXISTS "provider_events_scope_id_unique"
      ON "provider_events" ("tenant_id", "store_id", "connection_id", "id");
  `);
  console.log("CRM scope indexes are ready for Drizzle foreign keys.");
}

async function ensureFinancingScopeIndexes() {
  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "stores_id_tenant_unique"
      ON "stores" ("id", "tenant_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "financing_provider_accounts_id_tenant_unique"
      ON "financing_provider_accounts" ("id", "tenant_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "financing_provider_store_mappings_id_scope_unique"
      ON "financing_provider_store_mappings" ("id", "account_id", "tenant_id", "store_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "financing_customer_consents_id_scope_unique"
      ON "financing_customer_consents" ("id", "tenant_id", "store_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "financing_operation_requests_id_scope_unique"
      ON "financing_operation_requests" ("id", "tenant_id", "store_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "financing_inquiries_id_scope_unique"
      ON "financing_inquiries" ("id", "tenant_id", "store_id");
  `);
  console.log("Financing scope indexes are ready for Drizzle foreign keys.");
}

async function ensureBillingScopeIndexes() {
  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_id_tenant_unique"
      ON "subscriptions" ("id", "tenant_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "subscription_items_scoped_identity_unique"
      ON "subscription_items" ("id", "subscription_id", "tenant_id", "store_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "payments_scoped_identity_unique"
      ON "payments" ("id", "subscription_id", "tenant_id");
  `);
  console.log("Billing scope indexes are ready for Drizzle foreign keys.");
}

async function installScopeForeignKeys() {
  await detachScopeForeignKeys();
  await sql.begin(async (transaction) => {
    await transaction.unsafe(`
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
      ALTER TABLE "crm_connections"
        ADD CONSTRAINT "crm_connections_store_tenant_fk"
        FOREIGN KEY ("store_id", "tenant_id")
        REFERENCES "stores" ("id", "tenant_id");
      ALTER TABLE "crm_whatsapp_sessions"
        ADD CONSTRAINT "crm_whatsapp_sessions_scoped_connection_fk"
        FOREIGN KEY ("tenant_id", "store_id", "connection_id")
        REFERENCES "crm_connections" ("tenant_id", "store_id", "id");
      ALTER TABLE "crm_whatsapp_messages"
        ADD CONSTRAINT "crm_whatsapp_messages_scoped_session_fk"
        FOREIGN KEY ("tenant_id", "store_id", "connection_id", "session_id")
        REFERENCES "crm_whatsapp_sessions" ("tenant_id", "store_id", "connection_id", "id");
      ALTER TABLE "provider_events"
        ADD CONSTRAINT "provider_events_store_tenant_fk"
        FOREIGN KEY ("store_id", "tenant_id")
        REFERENCES "stores" ("id", "tenant_id"),
        ADD CONSTRAINT "provider_events_scoped_connection_fk"
        FOREIGN KEY ("tenant_id", "store_id", "connection_id")
        REFERENCES "crm_connections" ("tenant_id", "store_id", "id");
      ALTER TABLE "crm_webhook_effect_outbox"
        ADD CONSTRAINT "crm_webhook_effect_outbox_scoped_provider_event_fk"
        FOREIGN KEY ("tenant_id", "store_id", "connection_id", "provider_event_id")
        REFERENCES "provider_events" ("tenant_id", "store_id", "connection_id", "id")
        ON DELETE CASCADE,
        ADD CONSTRAINT "crm_webhook_effect_outbox_scoped_connection_fk"
        FOREIGN KEY ("tenant_id", "store_id", "connection_id")
        REFERENCES "crm_connections" ("tenant_id", "store_id", "id"),
        ADD CONSTRAINT "crm_webhook_effect_outbox_scoped_session_fk"
        FOREIGN KEY ("tenant_id", "store_id", "connection_id", "session_id")
        REFERENCES "crm_whatsapp_sessions" ("tenant_id", "store_id", "connection_id", "id"),
        ADD CONSTRAINT "crm_webhook_effect_outbox_scoped_message_fk"
        FOREIGN KEY ("tenant_id", "store_id", "connection_id", "session_id", "message_id")
        REFERENCES "crm_whatsapp_messages" ("tenant_id", "store_id", "connection_id", "session_id", "id");
      ALTER TABLE "crm_whatsapp_outbound_intents"
        ADD CONSTRAINT "crm_whatsapp_outbound_intents_scoped_connection_fk"
        FOREIGN KEY ("tenant_id", "store_id", "connection_id")
        REFERENCES "crm_connections" ("tenant_id", "store_id", "id"),
        ADD CONSTRAINT "crm_whatsapp_outbound_intents_scoped_session_fk"
        FOREIGN KEY ("tenant_id", "store_id", "connection_id", "session_id")
        REFERENCES "crm_whatsapp_sessions" ("tenant_id", "store_id", "connection_id", "id"),
        ADD CONSTRAINT "crm_whatsapp_outbound_intents_scoped_message_fk"
        FOREIGN KEY ("tenant_id", "store_id", "connection_id", "session_id", "message_id")
        REFERENCES "crm_whatsapp_messages" ("tenant_id", "store_id", "connection_id", "session_id", "id");
      ALTER TABLE "crm_whatsapp_intervention_ledger"
        ADD CONSTRAINT "crm_whatsapp_intervention_ledger_scoped_connection_fk"
        FOREIGN KEY ("tenant_id", "store_id", "connection_id")
        REFERENCES "crm_connections" ("tenant_id", "store_id", "id"),
        ADD CONSTRAINT "crm_whatsapp_intervention_ledger_scoped_session_fk"
        FOREIGN KEY ("tenant_id", "store_id", "connection_id", "session_id")
        REFERENCES "crm_whatsapp_sessions" ("tenant_id", "store_id", "connection_id", "id");
      ALTER TABLE "billing_provider_reconciliations"
        ADD CONSTRAINT "billing_provider_reconciliations_subscription_tenant_fk"
        FOREIGN KEY ("subscription_id", "tenant_id")
        REFERENCES "subscriptions" ("id", "tenant_id");
      ALTER TABLE "billing_addon_contracts"
        ADD CONSTRAINT "billing_addon_contracts_store_tenant_fk"
        FOREIGN KEY ("store_id", "tenant_id")
        REFERENCES "stores" ("id", "tenant_id"),
        ADD CONSTRAINT "billing_addon_contracts_subscription_tenant_fk"
        FOREIGN KEY ("subscription_id", "tenant_id")
        REFERENCES "subscriptions" ("id", "tenant_id"),
        ADD CONSTRAINT "billing_addon_contracts_item_scope_fk"
        FOREIGN KEY ("subscription_item_id", "subscription_id", "tenant_id", "store_id")
        REFERENCES "subscription_items" ("id", "subscription_id", "tenant_id", "store_id"),
        ADD CONSTRAINT "billing_addon_contracts_payment_scope_fk"
        FOREIGN KEY ("activated_by_payment_id", "subscription_id", "tenant_id")
        REFERENCES "payments" ("id", "subscription_id", "tenant_id");
      ALTER TABLE "financing_provider_store_mappings"
        ADD CONSTRAINT "financing_provider_store_mappings_account_scope_fk"
        FOREIGN KEY ("account_id", "tenant_id")
        REFERENCES "financing_provider_accounts" ("id", "tenant_id")
        ON DELETE CASCADE,
        ADD CONSTRAINT "financing_provider_store_mappings_store_scope_fk"
        FOREIGN KEY ("store_id", "tenant_id")
        REFERENCES "stores" ("id", "tenant_id")
        ON DELETE CASCADE;
      ALTER TABLE "financing_provider_store_banks"
        ADD CONSTRAINT "financing_provider_store_banks_mapping_scope_fk"
        FOREIGN KEY ("mapping_id", "account_id", "tenant_id", "store_id")
        REFERENCES "financing_provider_store_mappings" ("id", "account_id", "tenant_id", "store_id")
        ON DELETE CASCADE;
      ALTER TABLE "financing_provider_tokens"
        ADD CONSTRAINT "financing_provider_tokens_account_scope_fk"
        FOREIGN KEY ("account_id", "tenant_id")
        REFERENCES "financing_provider_accounts" ("id", "tenant_id")
        ON DELETE CASCADE;
      ALTER TABLE "provider_oauth_transactions"
        ADD CONSTRAINT "provider_oauth_transactions_account_scope_fk"
        FOREIGN KEY ("account_id", "tenant_id")
        REFERENCES "financing_provider_accounts" ("id", "tenant_id");
      ALTER TABLE "financing_customer_consents"
        ADD CONSTRAINT "financing_customer_consents_store_scope_fk"
        FOREIGN KEY ("store_id", "tenant_id")
        REFERENCES "stores" ("id", "tenant_id")
        ON DELETE CASCADE;
      ALTER TABLE "financing_inquiries"
        ADD CONSTRAINT "financing_inquiries_account_scope_fk"
        FOREIGN KEY ("account_id", "tenant_id")
        REFERENCES "financing_provider_accounts" ("id", "tenant_id"),
        ADD CONSTRAINT "financing_inquiries_mapping_scope_fk"
        FOREIGN KEY ("store_mapping_id", "account_id", "tenant_id", "store_id")
        REFERENCES "financing_provider_store_mappings" ("id", "account_id", "tenant_id", "store_id"),
        ADD CONSTRAINT "financing_inquiries_consent_scope_fk"
        FOREIGN KEY ("consent_id", "tenant_id", "store_id")
        REFERENCES "financing_customer_consents" ("id", "tenant_id", "store_id");
      ALTER TABLE "financing_operation_requests"
        ADD CONSTRAINT "financing_operation_requests_account_scope_fk"
        FOREIGN KEY ("account_id", "tenant_id")
        REFERENCES "financing_provider_accounts" ("id", "tenant_id"),
        ADD CONSTRAINT "financing_operation_requests_mapping_scope_fk"
        FOREIGN KEY ("mapping_id", "account_id", "tenant_id", "store_id")
        REFERENCES "financing_provider_store_mappings" ("id", "account_id", "tenant_id", "store_id"),
        ADD CONSTRAINT "financing_operation_requests_consent_scope_fk"
        FOREIGN KEY ("consent_id", "tenant_id", "store_id")
        REFERENCES "financing_customer_consents" ("id", "tenant_id", "store_id"),
        ADD CONSTRAINT "financing_operation_requests_inquiry_scope_fk"
        FOREIGN KEY ("inquiry_id", "tenant_id", "store_id")
        REFERENCES "financing_inquiries" ("id", "tenant_id", "store_id");
      ALTER TABLE "financing_conditions"
        ADD CONSTRAINT "financing_conditions_inquiry_scope_fk"
        FOREIGN KEY ("inquiry_id", "tenant_id", "store_id")
        REFERENCES "financing_inquiries" ("id", "tenant_id", "store_id")
        ON DELETE CASCADE;
      ALTER TABLE "financing_inquiry_events"
        ADD CONSTRAINT "financing_inquiry_events_inquiry_scope_fk"
        FOREIGN KEY ("inquiry_id", "tenant_id", "store_id")
        REFERENCES "financing_inquiries" ("id", "tenant_id", "store_id")
        ON DELETE CASCADE,
        ADD CONSTRAINT "financing_inquiry_events_operation_scope_fk"
        FOREIGN KEY ("operation_request_id", "tenant_id", "store_id")
        REFERENCES "financing_operation_requests" ("id", "tenant_id", "store_id");
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
    ...billingScopeIndexNames,
    ...crmScopeIndexNames,
    "financing_customer_consents_id_scope_unique",
    "financing_inquiries_id_scope_unique",
    "financing_operation_requests_id_scope_unique",
    "financing_provider_accounts_id_tenant_unique",
    "financing_provider_store_mappings_id_scope_unique",
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
      `Bootstrap scoped parent indexes are missing: ${missing.join(", ")}`,
    );
  }
  console.log("Bootstrap tables and scoped parent indexes verified.");
}

async function verifyFinalState() {
  const expectedConstraints = [
    "automation_approvals_decision_actor_consistent",
    "automation_approvals_proposal_digest_sha256",
    "automation_approvals_step_run_scope_fk",
    "automation_steps_run_scope_fk",
    ...billingScopeForeignKeyNames,
    ...crmScopeForeignKeyNames,
    "financing_conditions_inquiry_scope_fk",
    "financing_customer_consents_store_scope_fk",
    "financing_inquiries_account_scope_fk",
    "financing_inquiries_consent_scope_fk",
    "financing_inquiries_mapping_scope_fk",
    "financing_inquiry_events_inquiry_scope_fk",
    "financing_inquiry_events_operation_scope_fk",
    "financing_operation_requests_account_scope_fk",
    "financing_operation_requests_consent_scope_fk",
    "financing_operation_requests_inquiry_scope_fk",
    "financing_operation_requests_mapping_scope_fk",
    "financing_provider_store_banks_mapping_scope_fk",
    "financing_provider_store_mappings_account_scope_fk",
    "financing_provider_store_mappings_store_scope_fk",
    "financing_provider_tokens_account_scope_fk",
    "provider_oauth_transactions_account_scope_fk",
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
      `Scope constraints are missing after db push: ${missing.join(", ")}`,
    );
  }
  const expectedIndexes = [
    "automation_runs_id_scope_unique",
    "automation_steps_id_run_scope_unique",
    ...billingScopeIndexNames,
    ...crmScopeIndexNames,
    "financing_customer_consents_id_scope_unique",
    "financing_inquiries_id_scope_unique",
    "financing_operation_requests_id_scope_unique",
    "financing_provider_accounts_id_tenant_unique",
    "financing_provider_store_mappings_id_scope_unique",
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
      `Scope indexes are missing after db push: ${missingIndexes.join(", ")}`,
    );
  }
  console.log("Scope constraints verified in the local product DB.");
}
