import assert from "node:assert/strict";
import test from "node:test";
import { assertParity, collectParity } from "./target-parity.mjs";

test("billing entitlement parity ignores stale migration projections", async () => {
  const queries = [];
  const tx = {
    unsafe(query) {
      queries.push(query);
      if (query.includes("AS legacy"))
        return Promise.resolve([{ attachments: 0, legacy: 0 }]);
      if (query.includes("AS crm_conversation_threads"))
        return Promise.resolve([
          {
            crm_conversation_attendances: 0,
            crm_conversation_cycles: 0,
            crm_conversation_threads: 0,
            crm_messages: 0,
            crm_messages_with_media: 0,
          },
        ]);
      return Promise.resolve([{ count: 0 }]);
    },
  };

  await collectParity(tx, "00000000-0000-4000-8000-000000000001", {
    crmChannelConnections: new Map(),
  });

  assert.ok(
    queries.some((query) =>
      query.includes("metadata->>'migrationSelected'='true'"),
    ),
  );
});

test("canonical WhatsApp parity is limited to imported connections", async () => {
  const queries = [];
  const tx = {
    unsafe(query) {
      queries.push(query);
      if (query.includes("AS legacy")) return [{ attachments: 0, legacy: 0 }];
      if (query.includes("AS crm_conversation_threads"))
        return [
          {
            crm_conversation_attendances: 1,
            crm_conversation_cycles: 1,
            crm_conversation_threads: 1,
            crm_messages: 2,
            crm_messages_with_media: 1,
          },
        ];
      return [{ count: query.includes("crm_channel_connections") ? 1 : 0 }];
    },
  };

  const parity = await collectParity(tx, "store-id", {
    crmChannelConnections: new Map([[30, "connection-id"]]),
  });

  assert.equal(parity.crm_conversation_threads, 1);
  assert.equal(parity.crm_messages, 2);
  assert.ok(
    queries.some(
      (query) =>
        query.includes("provider_connection_id=ANY($2::uuid[])") &&
        query.includes("crm_conversation_attendances"),
    ),
  );
});

test("WhatsApp parity uses normalized target sessions and media URL counts", () => {
  const data = {
    accesses: [{ id: 1 }],
    whatsapp: {
      connections: [{ id: 30 }],
      messages: [
        { id: 1, media_url: "https://cdn.example/image.jpg" },
        { id: 2, media_url: null },
      ],
      sessions: [
        session({ id: 1, buyer_phone: "44999990000" }),
        session({ id: 2, buyer_phone: "5544999990000" }),
        session({ id: 3, buyer_phone: "", buyer_chat_lid: "private-lid" }),
      ],
    },
  };
  assert.doesNotThrow(() =>
    assertParity(
      data,
      {
        crm_conversation_attendances: 2,
        crm_conversation_cycles: 2,
        crm_conversation_threads: 2,
        crm_channel_connections: 1,
        crm_messages: 2,
        crm_messages_with_media: 1,
        users: 1,
      },
      new Set(["whatsapp"]),
    ),
  );
});

test("connection parity counts distinct canonical channels without dropping rows", () => {
  const data = {
    accesses: [],
    whatsapp: {
      connections: [{ id: 30 }],
      messages: [],
      sessions: [
        session({ id: 1, channel: "WHATSAPP" }),
        session({ id: 2, channel: "OLX_CHAT" }),
      ],
    },
  };

  assert.doesNotThrow(() =>
    assertParity(
      data,
      {
        crm_conversation_attendances: 2,
        crm_conversation_cycles: 2,
        crm_conversation_threads: 2,
        crm_channel_connections: 2,
        crm_messages: 0,
        crm_messages_with_media: 0,
        users: 0,
      },
      new Set(["whatsapp"]),
    ),
  );
});

test("WhatsApp parity reports a target mismatch", () => {
  const data = {
    accesses: [],
    whatsapp: { connections: [], messages: [], sessions: [] },
  };
  assert.throws(
    () =>
      assertParity(
        data,
        {
          crm_conversation_attendances: 1,
          crm_conversation_cycles: 0,
          crm_conversation_threads: 0,
          crm_channel_connections: 0,
          crm_messages: 0,
          crm_messages_with_media: 0,
          users: 0,
        },
        new Set(["whatsapp"]),
      ),
    /crm_conversation_attendances expected=0 actual=1/,
  );
});

test("lead parity includes deterministic WhatsApp-only coverage leads", () => {
  const data = {
    accesses: [],
    interactions: [],
    leads: [{ id: 1 }],
    tasks: [],
    whatsapp: {
      connections: [],
      generatedLeadCount: 1,
      messages: [],
      sessions: [],
    },
  };
  assert.doesNotThrow(() =>
    assertParity(
      data,
      {
        crm_conversation_attendances: 0,
        crm_conversation_cycles: 0,
        crm_conversation_threads: 0,
        crm_channel_connections: 0,
        crm_messages: 0,
        crm_messages_with_media: 0,
        lead_activities: 0,
        leads: 2,
        users: 0,
      },
      new Set(["leads", "whatsapp"]),
    ),
  );
});

test("foundation parity includes billing contract records", () => {
  const data = {
    accesses: [{ id: 1 }],
    billing: {
      entitlements: [{ featureKey: "analytics" }, { featureKey: "crm" }],
      payments: [{ legacy: { id: 1 } }],
      products: [{ key: "plan:growth" }, { key: "addon:crm" }],
    },
  };
  assert.doesNotThrow(() =>
    assertParity(
      data,
      {
        billing_customers: 1,
        payments: 1,
        store_entitlements: 2,
        subscription_items: 2,
        subscriptions: 1,
        users: 1,
      },
      new Set(),
    ),
  );
});

function session(overrides) {
  return {
    buyer_chat_lid: null,
    buyer_phone: "",
    connection_id: 30,
    created_at: "2026-01-01T00:00:00Z",
    last_message_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    uuid: `00000000-0000-4000-8000-${String(overrides.id).padStart(12, "0")}`,
    ...overrides,
  };
}
