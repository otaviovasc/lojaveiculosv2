import assert from "node:assert/strict";
import test from "node:test";
import {
  orderSeedTables,
  parseSeedArgs,
  remapSeedValue,
} from "./seed-existing-store.mjs";

test("requires an explicit target user and store", () => {
  assert.throws(() => parseSeedArgs(["--apply"]), /Usage:/);
  assert.deepEqual(
    parseSeedArgs([
      "--user-id=1794d7c0-306d-4dad-8d9c-623bd9bfb39f",
      "--store-id=f4b857a7-5fec-4660-84b7-1ac5871be6fe",
    ]),
    {
      apply: false,
      source: undefined,
      storeId: "f4b857a7-5fec-4660-84b7-1ac5871be6fe",
      userId: "1794d7c0-306d-4dad-8d9c-623bd9bfb39f",
    },
  );
});

test("remaps nested fixture values without changing dates or buffers", () => {
  const createdAt = new Date("2026-08-24T12:00:00.000Z");
  const buffer = Buffer.from("fixture");
  const result = remapSeedValue(
    {
      ids: ["source-store", "keep"],
      metadata: { store: "source-store" },
      createdAt,
      buffer,
    },
    { stringReplacements: [["source-store", "target-store"]] },
  );
  assert.equal(result.metadata.store, "target-store");
  assert.deepEqual(result.ids, ["target-store", "keep"]);
  assert.equal(result.createdAt, createdAt);
  assert.equal(result.buffer, buffer);
});

test("orders composite foreign-key parents before children", () => {
  assert.deepEqual(
    orderSeedTables(
      ["automation_approvals", "automation_steps", "automation_runs"],
      [
        {
          referencedTableName: "automation_runs",
          tableName: "automation_steps",
        },
        {
          referencedTableName: "automation_steps",
          tableName: "automation_approvals",
        },
      ],
    ),
    ["automation_runs", "automation_steps", "automation_approvals"],
  );
});
