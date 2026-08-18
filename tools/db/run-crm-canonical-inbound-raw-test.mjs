import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const containerName = `lojaveiculosv2-crm-canonical-${process.pid}-${Date.now()}`;
const databaseName = "crm_canonical_inbound_test";
const databaseUser = "crm_canonical_test";
const databasePassword = "crm_canonical_test";
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const fixtureIds = {
  legacyConnection: "24000000-0000-4000-8000-000000000058",
  canonicalConnection: "25000000-0000-4000-8000-000000000058",
  session: "26000000-0000-4000-8000-000000000058",
  message: "27000000-0000-4000-8000-000000000058",
  tag: "28000000-0000-4000-8000-000000000058",
  campaign: "29000000-0000-4000-8000-000000000058",
  pipeline: "34000000-0000-4000-8000-000000000058",
  pipelineStage: "35000000-0000-4000-8000-000000000058",
  providerEvent: "2a000000-0000-4000-8000-000000000058",
  sessionTag: "2b000000-0000-4000-8000-000000000058",
  commandReceipt: "2c000000-0000-4000-8000-000000000058",
  intervention: "2d000000-0000-4000-8000-000000000058",
  webhookEffect: "2e000000-0000-4000-8000-000000000058",
  outboundIntent: "2f000000-0000-4000-8000-000000000058",
  scheduledMessage: "30000000-0000-4000-8000-000000000058",
  campaignRecipient: "31000000-0000-4000-8000-000000000058",
  lead: "32000000-0000-4000-8000-000000000058",
  leadOutcome: "33000000-0000-4000-8000-000000000058",
};
const expectedGuardedTables = [
  "crm_connections",
  "crm_whatsapp_sessions",
  "crm_whatsapp_messages",
  "crm_whatsapp_session_tags",
  "crm_whatsapp_session_command_receipts",
  "crm_whatsapp_intervention_ledger",
  "crm_webhook_effect_outbox",
  "crm_whatsapp_outbound_intents",
  "crm_whatsapp_scheduled_messages",
  "crm_whatsapp_campaign_recipients",
  "crm_lead_outcomes",
];
const droppedLegacyTables = [
  "crm_whatsapp_intervention_ledger",
  "crm_whatsapp_session_command_receipts",
  "crm_whatsapp_session_tags",
  "crm_whatsapp_messages",
  "crm_whatsapp_sessions",
  "crm_connections",
];
const droppedLegacyTypes = [
  "crm_whatsapp_session_command_result",
  "crm_whatsapp_human_attendance_state",
  "crm_whatsapp_session_status",
  "crm_whatsapp_message_sender_origin",
  "crm_whatsapp_message_sender_type",
  "crm_whatsapp_message_direction",
  "crm_whatsapp_message_status",
  "crm_whatsapp_message_type",
  "crm_whatsapp_channel",
  "crm_connection_provider",
  "crm_connection_status",
];
const droppedLegacyFunctions = [
  "guard_crm_connection_provider_identity",
  "crm_whatsapp_session_transition_has_ledger",
  "crm_whatsapp_ledger_revision_not_future",
  "crm_whatsapp_intervention_ledger_append_only",
  "crm_whatsapp_sessions_revision_increment",
];
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
  prepareDatabaseRoles();
  await applyMigrationsThrough0057();
  await seedScope(databaseUrl);
  await verifyFailFastAndApply0058();
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

function prepareDatabaseRoles() {
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
}

async function applyMigrationsThrough0057() {
  const migrationDirectory = new URL(
    "../../packages/db/migrations/",
    import.meta.url,
  );
  const migrations = (await readdir(migrationDirectory))
    .filter((name) => /^\d{4}_.+\.sql$/u.test(name) && name < "0058_")
    .sort();

  for (const migration of migrations) {
    const sql = await readFile(new URL(migration, migrationDirectory), "utf8");
    runPsql(sql);
  }
}

async function verifyFailFastAndApply0058() {
  const migration = await readFile(
    new URL(
      "../../packages/db/migrations/0058_canonical_crm_operational_cutover.sql",
      import.meta.url,
    ),
    "utf8",
  );

  const guardBlock = getGuardBlock(migration);
  const guardedTables = getGuardedTables(guardBlock);
  assertEqual(
    guardedTables,
    expectedGuardedTables,
    "Migration 0058 guard table list",
  );

  for (const table of guardedTables) {
    expectPsqlFailure(
      `BEGIN;\n${buildGuardFixtureSql()}\n${guardBlock.replace(
        /ARRAY\[[\s\S]*?\]/u,
        `ARRAY['${table}']`,
      )}\n`,
      `CRM canonical operational cutover requires an empty ${table} table`,
    );
  }

  runPsql(`
    INSERT INTO crm_connections (
      id, display_name, provider, status, store_id, tenant_id
    ) VALUES (
      '${fixtureIds.legacyConnection}',
      '0058 fail-fast proof',
      'zapi',
      'sandbox',
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
  `);
  expectPsqlFailure(
    migration,
    "CRM canonical operational cutover requires an empty crm_connections table",
  );
  assertNo0058DdlLeakedAfterFailure();
  runPsql(`
    DELETE FROM crm_connections
    WHERE id = '${fixtureIds.legacyConnection}';
  `);
  runPsql(migration);
  assert0058PostMigrationCatalog();
}

function getGuardBlock(migration) {
  const guardEnd = migration.indexOf("--> statement-breakpoint");
  if (guardEnd < 0) {
    throw new Error("Migration 0058 is missing its initial guard block.");
  }
  return migration.slice(0, guardEnd);
}

function getGuardedTables(guardBlock) {
  const arrayMatch = guardBlock.match(/ARRAY\[([\s\S]*?)\]/u);
  if (!arrayMatch) {
    throw new Error("Migration 0058 guard block is missing its table array.");
  }
  return [...arrayMatch[1].matchAll(/'([^']+)'/gu)].map(([, table]) => table);
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label} mismatch: expected ${expected.join(", ")}; got ${actual.join(", ")}.`,
    );
  }
}

function buildGuardFixtureSql() {
  const {
    legacyConnection,
    canonicalConnection,
    session,
    message,
    tag,
    campaign,
    pipeline,
    pipelineStage,
    providerEvent,
    sessionTag,
    commandReceipt,
    intervention,
    webhookEffect,
    outboundIntent,
    scheduledMessage,
    campaignRecipient,
    lead,
    leadOutcome,
  } = fixtureIds;
  return `
    INSERT INTO crm_connections (
      id, display_name, provider, status, store_id, tenant_id
    ) VALUES (
      '${legacyConnection}', '0058 guard fixture', 'zapi', 'sandbox',
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO crm_channel_connections (
      id, broker, channel, display_name, provider, store_id, tenant_id
    ) VALUES (
      '${canonicalConnection}', 'direct', 'whatsapp', '0058 guard fixture',
      'zapi', '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO crm_whatsapp_sessions (
      id, buyer_phone, connection_id, store_id, tenant_id
    ) VALUES (
      '${session}', '5511999990058', '${canonicalConnection}',
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO crm_whatsapp_messages (
      id, connection_id, direction, sender_type, session_id, status,
      store_id, tenant_id
    ) VALUES (
      '${message}', '${canonicalConnection}', 'INBOUND', 'CUSTOMER',
      '${session}', 'PENDING', '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO crm_tags (id, name, connection_id, store_id, tenant_id)
    VALUES (
      '${tag}', '0058 guard fixture', '${canonicalConnection}',
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO crm_whatsapp_campaigns (
      id, content, name, scheduled_start_at, scheduled_end_at,
      selected_connection_id, store_id, tenant_id
    ) VALUES (
      '${campaign}', '0058 guard fixture', '0058 guard fixture', now(), now(),
      '${canonicalConnection}', '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO provider_events (
      id, connection_id, environment, event_type, provider, provider_event_id,
      store_id, tenant_id
    ) VALUES (
      '${providerEvent}', '${canonicalConnection}', 'sandbox', '0058_fixture',
      'zapi', '0058-fixture-event',
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO crm_whatsapp_session_tags (
      id, session_id, store_id, tag_id, tenant_id
    ) VALUES (
      '${sessionTag}', '${session}', '66666666-6666-4666-8666-666666666666',
      '${tag}', '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO crm_whatsapp_session_command_receipts (
      id, command_id, command_type, request_fingerprint, session_id,
      store_id, tenant_id
    ) VALUES (
      '${commandReceipt}', '${commandReceipt}', '0058_fixture', '0058-fingerprint',
      '${session}', '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO crm_whatsapp_intervention_ledger (
      id, actor_id, actor_kind, connection_id, idempotency_key,
      intervention_id, next_state, reason, request_fingerprint, session_id,
      session_revision, source, store_id, tenant_id
    ) VALUES (
      '${intervention}', '0058-test', 'system', '${canonicalConnection}',
      '0058-intervention', '${intervention}', 'WAITING_HUMAN', '0058 fixture',
      '0058-fingerprint', '${session}', 1, '0058-test',
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO crm_webhook_effect_outbox (
      id, connection_id, effect_type, message_id, provider_event_id, sequence,
      session_id, store_id, tenant_id
    ) VALUES (
      '${webhookEffect}', '${canonicalConnection}', 'audit_accepted', '${message}',
      '${providerEvent}', 1, '${session}',
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO crm_whatsapp_outbound_intents (
      id, claim_token, connection_id, fingerprint, idempotency_key,
      session_id, started_at, store_id, tenant_id
    ) VALUES (
      '${outboundIntent}', '${outboundIntent}', '${canonicalConnection}',
      '0058-fingerprint', '0058-outbound', '${session}', now(),
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO crm_whatsapp_scheduled_messages (
      id, connection_id, phone, scheduled_at, session_id, store_id, tenant_id,
      text
    ) VALUES (
      '${scheduledMessage}', '${canonicalConnection}', '5511999990058', now(),
      '${session}', '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777', '0058 fixture'
    );
    INSERT INTO crm_whatsapp_campaign_recipients (
      id, campaign_id, connection_id, phone, sequence, session_id, store_id,
      tenant_id
    ) VALUES (
      '${campaignRecipient}', '${campaign}', '${canonicalConnection}',
      '5511999990058', 1, '${session}',
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO crm_pipelines (id, name, store_id, tenant_id)
    VALUES (
      '${pipeline}', '0058 guard fixture',
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO crm_pipeline_stages (
      id, color, is_system, lead_status, name, pipeline_id, status, store_id,
      tenant_id
    ) VALUES (
      '${pipelineStage}', '#0058', true, 'new', '0058 guard fixture',
      '${pipeline}', 'open', '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO leads (
      id, buyer_name, pipeline_id, pipeline_stage_id, source, store_id, tenant_id
    )
    VALUES (
      '${lead}', '0058 guard fixture', '${pipeline}', '${pipelineStage}', 'manual',
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
    INSERT INTO crm_lead_outcomes (
      id, actor_id, actor_kind, channel, command_id, lead_id,
      origin_session_id, outcome, request_fingerprint, result, store_id,
      tenant_id
    ) VALUES (
      '${leadOutcome}', '0058-test', 'system', 'WHATSAPP', '0058-outcome',
      '${lead}', '${session}', 'follow_up', '0058-fingerprint', 'applied',
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777'
    );
  `;
}

function assertNo0058DdlLeakedAfterFailure() {
  runPsql(`
    DO $$
    BEGIN
      IF to_regclass('public.crm_connections') IS NULL THEN
        RAISE EXCEPTION '0058 failure leaked a DROP TABLE for crm_connections';
      END IF;
      IF to_regtype('public.canonical_message_origin') IS NOT NULL THEN
        RAISE EXCEPTION '0058 failure leaked CREATE TYPE canonical_message_origin';
      END IF;
      IF to_regclass('public.crm_conversation_thread_tags') IS NOT NULL THEN
        RAISE EXCEPTION '0058 failure leaked CREATE TABLE crm_conversation_thread_tags';
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'crm_conversation_threads'
          AND column_name = 'customer_chat_id'
      ) THEN
        RAISE EXCEPTION '0058 failure leaked ALTER TABLE crm_conversation_threads';
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'crm_webhook_effect_outbox'
          AND column_name = 'cycle_id'
      ) THEN
        RAISE EXCEPTION '0058 failure leaked dependent-table rewiring';
      END IF;
    END $$;
  `);
}

function assert0058PostMigrationCatalog() {
  const tableChecks = droppedLegacyTables
    .map(
      (table) => `
      IF to_regclass('public.${table}') IS NOT NULL THEN
        RAISE EXCEPTION '0058 left dropped table ${table} present';
      END IF;`,
    )
    .join("\n");
  const typeChecks = droppedLegacyTypes
    .map(
      (type) => `
      IF to_regtype('public.${type}') IS NOT NULL THEN
        RAISE EXCEPTION '0058 left dropped type ${type} present';
      END IF;`,
    )
    .join("\n");
  const functionChecks = droppedLegacyFunctions
    .map(
      (name) => `
      IF to_regprocedure('public.${name}()') IS NOT NULL THEN
        RAISE EXCEPTION '0058 left dropped function ${name} present';
      END IF;`,
    )
    .join("\n");
  const rewiredColumns = [
    ["crm_webhook_effect_outbox", "cycle_id"],
    ["crm_webhook_effect_outbox", "thread_id"],
    ["crm_whatsapp_outbound_intents", "cycle_id"],
    ["crm_whatsapp_outbound_intents", "thread_id"],
    ["crm_whatsapp_scheduled_messages", "thread_id"],
    ["crm_whatsapp_scheduled_messages", "cycle_id"],
    ["crm_whatsapp_campaign_recipients", "thread_id"],
    ["crm_lead_outcomes", "origin_cycle_id"],
  ]
    .map(
      ([table, column]) => `
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${table}'
          AND column_name = '${column}'
      ) THEN
        RAISE EXCEPTION '0058 missing rewired column ${table}.${column}';
      END IF;`,
    )
    .join("\n");
  const rewiredTables = [
    "crm_webhook_effect_outbox",
    "crm_whatsapp_outbound_intents",
    "crm_whatsapp_scheduled_messages",
    "crm_whatsapp_campaign_recipients",
    "crm_lead_outcomes",
  ]
    .map(
      (table) => `
      IF to_regclass('public.${table}') IS NULL THEN
        RAISE EXCEPTION '0058 dropped dependent table ${table}';
      END IF;`,
    )
    .join("\n");
  const removedDependentColumns = [
    ["crm_webhook_effect_outbox", "session_id"],
    ["crm_whatsapp_outbound_intents", "session_id"],
    ["crm_whatsapp_scheduled_messages", "session_id"],
    ["crm_whatsapp_campaign_recipients", "session_id"],
    ["crm_lead_outcomes", "origin_session_id"],
  ]
    .map(
      ([table, column]) => `
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${table}'
          AND column_name = '${column}'
      ) THEN
        RAISE EXCEPTION '0058 left legacy column ${table}.${column}';
      END IF;`,
    )
    .join("\n");
  const rewiredForeignKeys = [
    [
      "crm_webhook_effect_outbox_message_fk",
      "crm_webhook_effect_outbox",
      "crm_messages",
    ],
    [
      "crm_webhook_effect_outbox_scoped_thread_fk",
      "crm_webhook_effect_outbox",
      "crm_conversation_threads",
    ],
    [
      "crm_webhook_effect_outbox_semantic_cycle_fk",
      "crm_webhook_effect_outbox",
      "crm_conversation_cycles",
    ],
    [
      "crm_webhook_effect_outbox_semantic_message_fk",
      "crm_webhook_effect_outbox",
      "crm_messages",
    ],
    [
      "crm_whatsapp_outbound_intents_message_fk",
      "crm_whatsapp_outbound_intents",
      "crm_messages",
    ],
    [
      "crm_whatsapp_outbound_intents_scoped_thread_fk",
      "crm_whatsapp_outbound_intents",
      "crm_conversation_threads",
    ],
    [
      "crm_whatsapp_outbound_intents_semantic_cycle_fk",
      "crm_whatsapp_outbound_intents",
      "crm_conversation_cycles",
    ],
    [
      "crm_whatsapp_outbound_intents_semantic_message_fk",
      "crm_whatsapp_outbound_intents",
      "crm_messages",
    ],
    [
      "crm_whatsapp_scheduled_messages_sent_message_fk",
      "crm_whatsapp_scheduled_messages",
      "crm_messages",
    ],
    [
      "crm_whatsapp_scheduled_messages_scoped_thread_fk",
      "crm_whatsapp_scheduled_messages",
      "crm_conversation_threads",
    ],
    [
      "crm_whatsapp_scheduled_messages_semantic_cycle_fk",
      "crm_whatsapp_scheduled_messages",
      "crm_conversation_cycles",
    ],
    [
      "crm_whatsapp_campaign_recipients_scoped_thread_fk",
      "crm_whatsapp_campaign_recipients",
      "crm_conversation_threads",
    ],
    [
      "crm_lead_outcomes_origin_cycle_fk",
      "crm_lead_outcomes",
      "crm_conversation_cycles",
    ],
    [
      "crm_lead_outcomes_scoped_origin_cycle_fk",
      "crm_lead_outcomes",
      "crm_conversation_cycles",
    ],
  ]
    .map(
      ([name, table, target]) => `
      IF (
        SELECT count(*) FROM pg_constraint
        WHERE conname = '${name}'
          AND conrelid = to_regclass('public.${table}')
          AND confrelid = to_regclass('public.${target}')
      ) <> 1 THEN
        RAISE EXCEPTION '0058 missing or miswired foreign key ${name}';
      END IF;`,
    )
    .join("\n");

  runPsql(`
    DO $$
    BEGIN
      ${tableChecks}
      ${typeChecks}
      ${functionChecks}

      IF to_regclass('public.crm_channel_connections') IS NULL
        OR to_regclass('public.crm_conversation_threads') IS NULL
        OR to_regclass('public.crm_conversation_cycles') IS NULL
        OR to_regclass('public.crm_conversation_attendances') IS NULL
        OR to_regclass('public.crm_messages') IS NULL
        OR to_regclass('public.crm_conversation_thread_tags') IS NULL
        OR to_regclass('public.crm_conversation_command_receipts') IS NULL
        OR to_regclass('public.crm_conversation_attendance_events') IS NULL THEN
        RAISE EXCEPTION '0058 canonical CRM tables are incomplete';
      END IF;
      IF to_regtype('public.canonical_message_origin') IS NULL
        OR to_regtype('public.conversation_command_result') IS NULL
        OR to_regtype('public.conversation_attendance_actor_kind') IS NULL THEN
        RAISE EXCEPTION '0058 canonical CRM types are incomplete';
      END IF;

      ${rewiredTables}
      ${removedDependentColumns}

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'crm_conversation_threads'
          AND column_name IN ('channel_metadata', 'customer_chat_id',
            'customer_display_name', 'customer_phone', 'profile_photo_url', 'source')
        GROUP BY table_name HAVING count(*) = 6
      ) THEN
        RAISE EXCEPTION '0058 canonical thread columns are incomplete';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'crm_conversation_cycles'
          AND column_name IN ('first_handled_at', 'fresh_lead_at', 'last_customer_read_at',
            'last_message_at', 'last_message_content', 'last_read_at', 'message_count')
        GROUP BY table_name HAVING count(*) = 7
      ) THEN
        RAISE EXCEPTION '0058 canonical cycle columns are incomplete';
      END IF;

      ${rewiredColumns}

      ${rewiredForeignKeys}
    END $$;

  `);
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

function expectPsqlFailure(input, expectedMessage) {
  const result = spawnPsql(input);
  if (result.status === 0) {
    throw new Error(
      "Expected CRM migration 0058 to reject populated legacy data.",
    );
  }
  const output = `${result.stdout}\n${result.stderr}`;
  if (!output.includes(expectedMessage)) {
    throw new Error(
      `CRM migration 0058 failed for an unexpected reason: ${result.stderr.trim()}`,
    );
  }
}

function spawnPsql(input) {
  return spawnSync(
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
      "src/infrastructure/db/crm/drizzleCrmWhatsappAttendance.rawDb.test.ts",
      "src/infrastructure/db/crm/drizzleCrmWhatsappConsistency.rawDb.test.ts",
      "src/infrastructure/db/crm/drizzleExternalBotEffectHandoff.rawDb.test.ts",
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
