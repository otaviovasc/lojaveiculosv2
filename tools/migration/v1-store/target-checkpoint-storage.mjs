import { json } from "./common.mjs";
import { migrationErrorSummary } from "./log.mjs";

export async function initializeMigrationRun(
  sql,
  config,
  ids,
  modules,
  fingerprint,
) {
  const metadata = {
    checkpointMode: "staged-v1",
    fingerprint,
    legacyStoreId: config.legacyStoreId,
    modules: [...modules],
    replaceWhatsappHistory: config.replaceWhatsappHistory,
    source: "v1-directory-archive",
  };
  const [run] =
    await sql`INSERT INTO migration_runs (id, dump_label, metadata, started_at, status, created_at, updated_at)
      VALUES (${ids.run}, ${config.dumpLabel}, ${sql.json(metadata)}, now(), 'running', now(), now())
      ON CONFLICT (id) DO UPDATE SET
        completed_at=null,
        dump_label=excluded.dump_label,
        metadata=(migration_runs.metadata - 'lastFailure') || excluded.metadata,
        started_at=now(),
        status='running',
        updated_at=now()
      RETURNING metadata`;
  return json(json(run).metadata).checkpoints ?? {};
}

export async function saveStageCheckpoint(tx, runId, stageKey, checkpoint) {
  await tx`UPDATE migration_runs SET
    metadata=jsonb_set(
      metadata,
      '{checkpoints}',
      COALESCE(metadata->'checkpoints', '{}'::jsonb) || ${tx.json({
        [stageKey]: checkpoint,
      })},
      true
    ),
    updated_at=now()
    WHERE id=${runId}`;
}

export async function recordMigrationFailure(sql, runId, stageKey, error) {
  const failure = {
    error: migrationErrorSummary(error),
    failedAt: new Date().toISOString(),
    stage: stageKey,
  };
  await sql`UPDATE migration_runs SET
    completed_at=now(),
    metadata=jsonb_set(metadata, '{lastFailure}', ${sql.json(failure)}, true),
    status='failed',
    updated_at=now()
    WHERE id=${runId}`;
}

export async function finalizeMigrationRun(sql, runId, metadata) {
  await sql`UPDATE migration_runs SET
    completed_at=now(),
    metadata=(metadata - 'lastFailure') || ${sql.json(metadata)},
    status='succeeded',
    updated_at=now()
    WHERE id=${runId}`;
}
