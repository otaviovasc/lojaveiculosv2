import assert from "node:assert/strict";
import test from "node:test";
import { seedWhatsappConnections } from "./target-crm-whatsapp-connections.mjs";

test("creates an inert canonical OLX connection for imported OLX history", async () => {
  const previousSecret = process.env.CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY;
  process.env.CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY = "test-only-secret";
  const inserts = [];
  const tx = (strings, ...values) => {
    inserts.push({ query: strings.join("?"), values });
    return Promise.resolve([]);
  };
  tx.json = (value) => value;

  const ids = {
    crmChannelConnections: new Map(),
    store: "store-id",
    tenant: "tenant-id",
  };
  try {
    await seedWhatsappConnections(
      tx,
      {
        connections: [
          {
            created_at: "2026-01-01T00:00:00Z",
            id: 30,
            name: "Imported channel",
            updated_at: "2026-01-02T00:00:00Z",
            uuid: "legacy-connection-uuid",
          },
        ],
        sessions: [{ channel: "OLX_CHAT", connection_id: 30 }],
      },
      { legacyStoreId: 10 },
      ids,
    );
  } finally {
    if (previousSecret === undefined) {
      delete process.env.CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY;
    } else {
      process.env.CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY = previousSecret;
    }
  }

  assert.equal(inserts.length, 1);
  assert.ok(ids.crmChannelConnections.has("30:olx_chat"));
  assert.ok(inserts[0].values.includes("olx_chat"));
  assert.ok(inserts[0].values.includes("olx"));
  assert.ok(inserts[0].values.includes("paused"));
  const metadata = inserts[0].values.find(
    (value) => value?.migration?.historicalImportOnly === true,
  );
  assert.deepEqual(metadata.capabilities, {
    inbound: false,
    outbound: false,
    scheduling: false,
    templates: false,
  });
  assert.equal(metadata.migration.officialOperation, false);
});
