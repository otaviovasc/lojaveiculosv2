import assert from "node:assert/strict";
import test from "node:test";
import { targetId } from "./common.mjs";
import { reconcileLegacyProjection } from "./target-reconciliation.mjs";

test("reconciliation only deactivates migration-owned rows absent from the dump", async () => {
  const calls = [];
  const tx = {
    unsafe(query, params) {
      calls.push({ params, query });
      return Promise.resolve([]);
    },
  };
  const data = {
    documents: [{ id: 61 }],
    entries: [{ attachmentR2Key: "entry/51.pdf", id: 51 }, { id: 52 }],
    leads: [{ id: 21 }],
    photos: [{ id: 12 }],
    recurringEntries: [{ id: 41 }],
    salePayments: [{ id: 31 }],
    sales: [{ id: 30 }],
    vehicles: [{ id: 11 }],
  };
  const config = { legacyStoreId: 200 };
  await reconcileLegacyProjection(
    tx,
    data,
    config,
    { store: "00000000-0000-4000-8000-000000000200" },
    new Set(["attachments", "documents", "leads", "sales", "vehicles"]),
  );

  assert.equal(calls.length, 10);
  assert.ok(
    calls.every(
      ({ query }) =>
        query.includes("legacyV1") || query.includes("vehicle_units AS unit"),
    ),
  );
  assert.ok(calls.every(({ query }) => query.includes("store_id=$1")));
  assert.deepEqual(calls[0].params[1], [targetId(200, "FotosVeiculo", 12)]);
  assert.ok(
    calls.some(({ query }) =>
      query.includes("metadata->'legacyV1'->>'sourceTable'='SalePayment'"),
    ),
  );
  assert.ok(
    calls.some(({ query }) =>
      query.includes("metadata ? 'migrationReconciliation'"),
    ),
  );
  assert.ok(
    calls.some(
      ({ params, query }) =>
        query.includes("sourceTable'='Entry.attachment'") &&
        params[1].length === 1,
    ),
  );
});

test("reconciliation reports changed rows without deleting them", async () => {
  const tx = {
    unsafe(query) {
      return Promise.resolve(
        query.includes("UPDATE leads") ? [{ id: "stale-lead" }] : [],
      );
    },
  };
  const result = await reconcileLegacyProjection(
    tx,
    {
      documents: [],
      entries: [],
      leads: [],
      photos: [],
      recurringEntries: [],
      salePayments: [],
      sales: [],
      vehicles: [],
    },
    { legacyStoreId: 200 },
    { store: "00000000-0000-4000-8000-000000000200" },
    new Set(["leads"]),
  );

  assert.equal(result.leads, 1);
});
