import assert from "node:assert/strict";
import test from "node:test";
import { toCanonicalMessageRow } from "./target-crm-whatsapp-messages.mjs";

test("maps a legacy message to the canonical message contract", () => {
  const row = toCanonicalMessageRow(
    { json: (value) => value },
    message(),
    config(),
    "cycle-id",
    "thread-id",
    new Map(),
  );

  assert.equal(row.cycle_id, "cycle-id");
  assert.equal(row.thread_id, "thread-id");
  assert.equal(row.provider_connection_id, "connection-id");
  assert.equal(row.provider, "zapi");
  assert.equal(row.direction, "inbound");
  assert.equal(row.sender, "customer");
  assert.equal(row.sender_origin, "customer");
  assert.equal(row.status, "delivered");
  assert.equal(row.provider_message_id, "provider-message-id");
  assert.equal(row.metadata.channelMessageId, "channel-message-id");
  assert.equal(
    row.metadata.providerMetadata.legacyRepasses.sourceSessionId,
    "44",
  );
});

test("deduplicates provider message ids across cycles on one connection", () => {
  const used = new Map();
  const first = toCanonicalMessageRow(
    { json: (value) => value },
    message(),
    config(),
    "cycle-one",
    "thread-one",
    used,
  );
  const second = toCanonicalMessageRow(
    { json: (value) => value },
    message({ id: 2, uuid: "second-uuid" }),
    config(),
    "cycle-two",
    "thread-two",
    used,
  );

  assert.equal(first.provider_message_id, "provider-message-id");
  assert.equal(second.provider_message_id, "legacy:second-uuid");
});

function config() {
  return {
    crmChannelConnectionIds: new Map([[30, "connection-id"]]),
    legacyStoreId: 10,
    storeId: "store-id",
    tenantId: "tenant-id",
  };
}

function message(overrides = {}) {
  return {
    channel: "WHATSAPP",
    channel_message_id: "channel-message-id",
    chat_session_id: 44,
    connection_id: 30,
    content: "Hello",
    created_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    direction: "INBOUND",
    external_id: "provider-message-id",
    id: 1,
    media_type: null,
    media_url: null,
    provider_timestamp: "2026-01-01T00:00:01Z",
    sender_agent_id: null,
    sender_type: "CUSTOMER",
    status: "DELIVERED",
    type: "TEXT",
    updated_at: "2026-01-01T00:00:02Z",
    uuid: "first-uuid",
    ...overrides,
  };
}
