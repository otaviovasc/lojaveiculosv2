import { CRM_UI_DEMO_NAMESPACE } from "./crm-ui-demo-fixtures.mjs";

export function parseCrmUiDemoSeedArgs(argv) {
  const userId = readOption(argv, "user-id");
  const storeId = readOption(argv, "store-id");
  if (!userId || !storeId) {
    throw new Error(
      "Usage: pnpm staging:seed-crm -- --user-id=<userId> --store-id=<storeId> [--apply]",
    );
  }
  return { apply: argv.includes("--apply"), storeId, userId };
}

export async function resolveCrmUiDemoScope(sql, input) {
  const users = await sql`SELECT id, clerk_user_id
    FROM users
    WHERE id::text=${input.userId} OR clerk_user_id=${input.userId}
    ORDER BY CASE WHEN id::text=${input.userId} THEN 0 ELSE 1 END
    LIMIT 2`;
  if (!users.length)
    throw new Error(`Target V2 user was not found: ${input.userId}`);
  if (users.length > 1)
    throw new Error(`Target V2 user id is ambiguous: ${input.userId}`);

  const [store] = await sql`SELECT id, tenant_id
    FROM stores
    WHERE id=${input.storeId} AND is_deleted=false
    LIMIT 1`;
  if (!store)
    throw new Error(`Target staging store was not found: ${input.storeId}`);
  const [access] = await sql`SELECT 1
    FROM store_memberships
    WHERE user_id=${users[0].id} AND store_id=${store.id} AND status='active'
    UNION ALL
    SELECT 1
    FROM tenant_memberships
    WHERE user_id=${users[0].id} AND tenant_id=${store.tenant_id}
      AND status='active'
    LIMIT 1`;
  if (!access)
    throw new Error(
      "Target user does not have active access to the target store.",
    );
  return { storeId: store.id, tenantId: store.tenant_id, userId: users[0].id };
}

export async function resolveCrmUiDemoPipeline(sql, scope) {
  const [pipeline] = await sql`SELECT id
    FROM crm_pipelines
    WHERE tenant_id=${scope.tenantId} AND store_id=${scope.storeId}
      AND is_deleted=false
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1`;
  if (!pipeline) {
    throw new Error(
      "The store has no CRM pipeline. Run staging:seed-store before this CRM demo seed.",
    );
  }
  const stages = await sql`SELECT id, lead_status
    FROM crm_pipeline_stages
    WHERE tenant_id=${scope.tenantId} AND store_id=${scope.storeId}
      AND pipeline_id=${pipeline.id} AND is_deleted=false
    ORDER BY sort_order ASC, created_at ASC`;
  if (!stages.length) {
    throw new Error(
      "The selected CRM pipeline has no stages. Run staging:seed-store first.",
    );
  }
  return {
    fallbackStageId: stages[0].id,
    pipelineId: pipeline.id,
    stageIds: Object.fromEntries(
      stages.map((stage) => [stage.lead_status, stage.id]),
    ),
  };
}

export async function assertCrmUiDemoOwnership(tx, fixtures) {
  const groups = [
    ["crm_channel_connections", [fixtures.connection.id]],
    ["contacts", fixtures.contacts.map((row) => row.id)],
    ["leads", fixtures.leads.map((row) => row.id)],
    ["opportunities", fixtures.opportunities.map((row) => row.id)],
    ["crm_conversation_threads", fixtures.threads.map((row) => row.id)],
    ["crm_conversation_cycles", fixtures.cycles.map((row) => row.id)],
    ["crm_messages", fixtures.messages.map((row) => row.id)],
  ];
  for (const [tableName, ids] of groups) {
    const existing = await tx`SELECT id, metadata
      FROM ${tx(tableName)}
      WHERE id IN ${tx(ids)}`;
    const conflict = existing.find(
      (row) => row.metadata?.fixtureNamespace !== CRM_UI_DEMO_NAMESPACE,
    );
    if (conflict) {
      throw new Error(
        `Refusing to replace a non-demo staging row: ${tableName}/${conflict.id}`,
      );
    }
  }
  const attendanceIds = fixtures.attendances.map((row) => row.id);
  const attendances = await tx`SELECT attendance.id, cycle.metadata
    FROM crm_conversation_attendances AS attendance
    INNER JOIN crm_conversation_cycles AS cycle ON cycle.id=attendance.cycle_id
    WHERE attendance.id IN ${tx(attendanceIds)}`;
  const conflict = attendances.find(
    (row) => row.metadata?.fixtureNamespace !== CRM_UI_DEMO_NAMESPACE,
  );
  if (conflict) {
    throw new Error(
      `Refusing to replace a non-demo staging row: crm_conversation_attendances/${conflict.id}`,
    );
  }
}

export async function readCrmUiDemoCounts(sql, scope) {
  const [row] = await sql`SELECT
    (SELECT count(*)::int FROM crm_channel_connections WHERE tenant_id=${scope.tenantId} AND store_id=${scope.storeId} AND metadata->>'fixtureNamespace'=${CRM_UI_DEMO_NAMESPACE}) AS connections,
    (SELECT count(*)::int FROM contacts WHERE tenant_id=${scope.tenantId} AND store_id=${scope.storeId} AND metadata->>'fixtureNamespace'=${CRM_UI_DEMO_NAMESPACE}) AS contacts,
    (SELECT count(*)::int FROM leads WHERE tenant_id=${scope.tenantId} AND store_id=${scope.storeId} AND metadata->>'fixtureNamespace'=${CRM_UI_DEMO_NAMESPACE}) AS leads,
    (SELECT count(*)::int FROM opportunities WHERE tenant_id=${scope.tenantId} AND store_id=${scope.storeId} AND metadata->>'fixtureNamespace'=${CRM_UI_DEMO_NAMESPACE}) AS opportunities,
    (SELECT count(*)::int FROM crm_conversation_threads WHERE tenant_id=${scope.tenantId} AND store_id=${scope.storeId} AND metadata->>'fixtureNamespace'=${CRM_UI_DEMO_NAMESPACE}) AS threads,
    (SELECT count(*)::int FROM crm_conversation_cycles WHERE tenant_id=${scope.tenantId} AND store_id=${scope.storeId} AND metadata->>'fixtureNamespace'=${CRM_UI_DEMO_NAMESPACE}) AS cycles,
    (SELECT count(*)::int FROM crm_messages WHERE tenant_id=${scope.tenantId} AND store_id=${scope.storeId} AND metadata->>'fixtureNamespace'=${CRM_UI_DEMO_NAMESPACE}) AS messages,
    (SELECT count(*)::int FROM crm_messages WHERE tenant_id=${scope.tenantId} AND store_id=${scope.storeId} AND metadata->>'fixtureNamespace'=${CRM_UI_DEMO_NAMESPACE} AND message_type='image') AS images,
    (SELECT count(*)::int FROM crm_messages WHERE tenant_id=${scope.tenantId} AND store_id=${scope.storeId} AND metadata->>'fixtureNamespace'=${CRM_UI_DEMO_NAMESPACE} AND message_type='video') AS videos,
    (SELECT count(*)::int FROM crm_messages WHERE tenant_id=${scope.tenantId} AND store_id=${scope.storeId} AND metadata->>'fixtureNamespace'=${CRM_UI_DEMO_NAMESPACE} AND message_type='audio') AS audios`;
  return row;
}

export async function persistCrmUiDemoAudit(sql, input) {
  await sql`INSERT INTO audit_events
    (action, actor_id, actor_kind, category, changes, criticality,
     data_classification, entity_id, entity_type, failure_tier, metadata,
     outcome, request_context, request_id, severity, source, store_id,
     summary, tags, target, tenant_id, created_at, updated_at)
    VALUES ('staging.crm.ui_demo_seed', 'staging_operator', 'system',
      'data_change', ${sql.json([{ after: input.counts, before: null, path: "crm_ui_demo" }])},
      'high', 'internal', ${input.scope.storeId}, 'crm_ui_demo', 'required',
      ${sql.json({ fixtureNamespace: CRM_UI_DEMO_NAMESPACE, targetUserId: input.scope.userId })},
      'succeeded', ${sql.json({ requestId: input.requestId })}, ${input.requestId},
      'info', ${sql.json({ component: "seed-crm-ui-demo", environment: "staging", service: "operator" })},
      ${input.scope.storeId}, 'Seeded fictional CRM UI demo data into a staging store.',
      ${sql.json(["staging", "fixture_seed", "crm_ui_demo"])},
      ${sql.json({ id: input.scope.storeId, type: "store" })},
      ${input.scope.tenantId}, now(), now())`;
}

export function connectionOptions(value) {
  const local = ["127.0.0.1", "localhost", "::1"].includes(
    new URL(value).hostname,
  );
  return { max: 1, prepare: false, ssl: local ? false : "require" };
}

function readOption(argv, name) {
  return argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
    .trim();
}
