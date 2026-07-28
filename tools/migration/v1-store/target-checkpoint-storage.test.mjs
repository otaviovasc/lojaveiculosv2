import assert from "node:assert/strict";
import test from "node:test";
import {
  finalizeMigrationRun,
  initializeMigrationRun,
  recordMigrationFailure,
  saveStageCheckpoint,
} from "./target-checkpoint-storage.mjs";

test("checkpoint storage preserves completed stages across attempts", async () => {
  const checkpoint = {
    completedAt: "2026-07-28T00:00:00.000Z",
    fingerprint: "source-1",
    version: "version-1",
  };
  const { calls, sql } = fakeSql({
    checkpoints: { inventory: checkpoint },
  });

  const loaded = await initializeMigrationRun(
    sql,
    {
      dumpLabel: "attempt-2",
      legacyStoreId: 200,
      replaceWhatsappHistory: true,
    },
    { run: "run-1" },
    new Set(["vehicles"]),
    "source-1",
  );
  await saveStageCheckpoint(sql, "run-1", "crm", checkpoint);
  await recordMigrationFailure(
    sql,
    "run-1",
    "sales",
    new Error("late failure"),
  );
  await finalizeMigrationRun(sql, "run-1", { parity: { sales: 35 } });

  assert.deepEqual(loaded, { inventory: checkpoint });
  assert.match(calls[0].text, /migration_runs\.metadata - 'lastFailure'/);
  assert.match(calls[1].text, /metadata->'checkpoints'/);
  assert.deepEqual(
    calls[1].values.find((value) => value?.crm)?.crm,
    checkpoint,
  );
  assert.match(calls[2].text, /status='failed'/);
  assert.match(calls[3].text, /status='succeeded'/);
});

function fakeSql(existingMetadata) {
  const calls = [];
  const sql = async (strings, ...values) => {
    const text = strings.reduce(
      (result, part, index) => `${result}${index ? `$${index}` : ""}${part}`,
      "",
    );
    calls.push({ text, values });
    if (text.includes("RETURNING metadata"))
      return [{ metadata: existingMetadata }];
    return [];
  };
  sql.json = (value) => value;
  return { calls, sql };
}
