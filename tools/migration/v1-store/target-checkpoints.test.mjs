import assert from "node:assert/strict";
import test from "node:test";
import {
  checkpointMatches,
  createMigrationFingerprint,
  executeCheckpointedStage,
  stageCheckpointVersion,
} from "./target-checkpoints.mjs";

test("migration fingerprints change with source data and output-affecting config", () => {
  const data = { leads: [{ id: 1 }], store: { id: 200 } };
  const config = {
    accessEmails: new Map([[432, "user@example.test"]]),
    legacyStoreId: 200,
    ownerClerkUserId: "owner_1",
    storeSlug: "store-1",
  };
  const modules = new Set(["leads"]);
  const original = createMigrationFingerprint(data, config, modules);

  assert.equal(createMigrationFingerprint(data, config, modules), original);
  assert.notEqual(
    createMigrationFingerprint(
      { ...data, leads: [{ id: 1 }, { id: 2 }] },
      config,
      modules,
    ),
    original,
  );
  assert.notEqual(
    createMigrationFingerprint(
      data,
      { ...config, storeSlug: "store-2" },
      modules,
    ),
    original,
  );
});

test("matching checkpoints skip committed stages and mismatches rerun them", async () => {
  const expected = {
    fingerprint: "source-1",
    version: stageCheckpointVersion("inventory"),
  };
  let transactionCalls = 0;
  const skipped = await executeCheckpointedStage({
    checkpoint: { ...expected, completedAt: "2026-07-28T00:00:00.000Z" },
    executeTransaction: async () => {
      transactionCalls += 1;
    },
    expected,
    label: "Inventory",
    resume: true,
    stageKey: "inventory",
  });

  assert.equal(skipped.skipped, true);
  assert.equal(transactionCalls, 0);
  assert.equal(checkpointMatches(skipped.checkpoint, expected), true);

  const completed = await executeCheckpointedStage({
    checkpoint: { ...expected, version: "outdated" },
    executeTransaction: async (checkpoint) => {
      transactionCalls += 1;
      assert.equal(checkpoint.fingerprint, expected.fingerprint);
      assert.equal(checkpoint.version, expected.version);
    },
    expected,
    label: "Inventory",
    resume: true,
    stageKey: "inventory",
  });

  assert.equal(completed.skipped, false);
  assert.equal(transactionCalls, 1);
  assert.equal(checkpointMatches(completed.checkpoint, expected), true);
});
