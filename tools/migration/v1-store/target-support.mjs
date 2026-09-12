import { targetId } from "./common.mjs";

export async function addLegacyMap(
  tx,
  runId,
  sourceTable,
  legacyId,
  targetTable,
  mappedId,
) {
  if (!mappedId)
    throw new Error(
      `Cannot map ${sourceTable} ${legacyId}: target id is missing.`,
    );
  await tx`INSERT INTO legacy_id_maps
    (id, migration_run_id, source_table, legacy_id, target_table, target_id,
     created_at, updated_at)
    VALUES (${targetId(runId, sourceTable, legacyId)}, ${runId}, ${sourceTable},
      ${String(legacyId)}, ${targetTable}, ${mappedId}, now(), now())
    ON CONFLICT (migration_run_id, source_table, legacy_id) DO UPDATE SET
      target_table=excluded.target_table,
      target_id=excluded.target_id,
      updated_at=now()`;
}
