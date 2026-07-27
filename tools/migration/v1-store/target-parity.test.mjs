import assert from "node:assert/strict";
import test from "node:test";
import { assertParity } from "./target-parity.mjs";

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
        crm_connections: 1,
        crm_whatsapp_media_messages: 1,
        crm_whatsapp_messages: 2,
        crm_whatsapp_sessions: 2,
        users: 1,
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
          crm_connections: 0,
          crm_whatsapp_media_messages: 0,
          crm_whatsapp_messages: 0,
          crm_whatsapp_sessions: 1,
          users: 0,
        },
        new Set(["whatsapp"]),
      ),
    /crm_whatsapp_sessions expected=0 actual=1/,
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
        crm_connections: 0,
        crm_whatsapp_media_messages: 0,
        crm_whatsapp_messages: 0,
        crm_whatsapp_sessions: 0,
        lead_activities: 0,
        leads: 2,
        users: 0,
      },
      new Set(["leads", "whatsapp"]),
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
