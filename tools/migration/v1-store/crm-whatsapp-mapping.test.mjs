import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLeadCrmSessionIndex,
  buildLeadPhoneIndex,
  findLegacyLeadId,
  groupWhatsappSessions,
  mapRepassesConnection,
  mapRepassesSessionStatus,
  normalizeWhatsappPhone,
  resolveLegacyLeadLink,
  whatsappPhoneAliases,
} from "./crm-whatsapp-mapping.mjs";

test("normalizes Brazilian WhatsApp phone variants", () => {
  assert.equal(normalizeWhatsappPhone("(44) 99999-0000"), "5544999990000");
  assert.equal(normalizeWhatsappPhone("005544999990000"), "5544999990000");
  assert.deepEqual(whatsappPhoneAliases("5544999990000"), [
    "5544999990000",
    "554499990000",
  ]);
});

test("groups duplicate sessions and preserves LID-only identities", () => {
  const groups = groupWhatsappSessions([
    session({ id: 1, buyer_phone: "(44) 99999-0000" }),
    session({
      id: 2,
      buyer_phone: "5544999990000",
      last_message_at: "2026-02-01T00:00:00Z",
    }),
    session({ id: 3, buyer_phone: "", buyer_chat_lid: "private-lid" }),
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].members.length, 2);
  assert.equal(groups[0].canonical.id, 2);
  assert.equal(groups[1].buyerPhone, "lid:private-lid");
});

test("links a session to one unambiguous lead through phone aliases", () => {
  const leads = [
    { id: 10, phone: "44999990000" },
    { id: 20, phone: "4433330000" },
  ];
  const group = groupWhatsappSessions([
    session({ buyer_phone: "5544999990000" }),
  ])[0];
  assert.equal(
    findLegacyLeadId(
      group,
      buildLeadPhoneIndex(leads),
      new Set(leads.map((lead) => lead.id)),
    ),
    10,
  );
});

test("prefers V1 lead sync crm_session_id over phone parsing", () => {
  const leads = [
    { crm_session_id: 44, id: 10, phone: null },
    { crm_session_id: null, id: 20, phone: "44999990000" },
  ];
  const group = groupWhatsappSessions([
    session({ buyer_phone: "5544999990000", id: 44 }),
  ])[0];
  assert.deepEqual(
    resolveLegacyLeadLink(
      group,
      buildLeadCrmSessionIndex(leads),
      buildLeadPhoneIndex(leads),
      new Set(leads.map((lead) => lead.id)),
    ),
    { leadId: 10, strategy: "crm_session_id" },
  );
});

test("does not guess when V1 crm_session_id is duplicated", () => {
  const leads = [
    { crm_session_id: 44, id: 10, phone: null },
    { crm_session_id: 44, id: 20, phone: null },
  ];
  const group = groupWhatsappSessions([session({ id: 44 })])[0];
  assert.deepEqual(
    resolveLegacyLeadLink(
      group,
      buildLeadCrmSessionIndex(leads),
      buildLeadPhoneIndex(leads),
      new Set(leads.map((lead) => lead.id)),
    ),
    { leadId: null, strategy: "ambiguous" },
  );
});

test("does not guess when exact Repasses and V1 sync identifiers conflict", () => {
  const leads = [
    { crm_session_id: 44, id: 10, phone: null },
    { crm_session_id: null, id: 20, phone: null },
  ];
  const group = groupWhatsappSessions([
    session({ id: 44, source_lead_id: 20 }),
  ])[0];
  assert.deepEqual(
    resolveLegacyLeadLink(
      group,
      buildLeadCrmSessionIndex(leads),
      buildLeadPhoneIndex(leads),
      new Set(leads.map((lead) => lead.id)),
    ),
    { leadId: null, strategy: "ambiguous" },
  );
});

test("does not guess when two leads share the same phone", () => {
  const leads = [
    { id: 10, phone: "44999990000" },
    { id: 20, phone: "5544999990000" },
  ];
  const group = groupWhatsappSessions([
    session({ buyer_phone: "5544999990000" }),
  ])[0];
  assert.equal(
    findLegacyLeadId(
      group,
      buildLeadPhoneIndex(leads),
      new Set(leads.map((lead) => lead.id)),
    ),
    null,
  );
});

test("maps stored Z-API credentials without exposing them in metadata", () => {
  const mapped = mapRepassesConnection(
    {
      credentials: { instanceId: "instance", token: "secret" },
      id: 30,
      is_active: true,
      provider: "ZAPI",
      status: "CONNECTED",
    },
    { activate: true },
  );
  assert.deepEqual(mapped, {
    credentialsRef: {
      mode: "stored",
      stored: { instanceId: "instance", instanceToken: "secret" },
    },
    externalInstanceId: "instance",
    provider: "zapi",
    status: "active",
  });
});

test("keeps an imported connection paused until cutover activation", () => {
  const mapped = mapRepassesConnection({
    credentials: { instanceId: "instance", token: "secret" },
    id: 30,
    is_active: true,
    provider: "ZAPI",
    status: "CONNECTED",
  });
  assert.equal(mapped.status, "paused");
});

test("maps unsupported legacy session states and deleted sessions safely", () => {
  assert.equal(
    mapRepassesSessionStatus({ status: "WAITING_RESPONSE" }),
    "ACTIVE",
  );
  assert.equal(
    mapRepassesSessionStatus({
      deleted_at: "2026-01-01T00:00:00Z",
      status: "ACTIVE",
    }),
    "EXPIRED",
  );
});

function session(overrides = {}) {
  return {
    buyer_chat_lid: null,
    buyer_phone: "554433330000",
    connection_id: 30,
    created_at: "2026-01-01T00:00:00Z",
    id: 1,
    last_message_at: "2026-01-01T00:00:00Z",
    source_lead_id: null,
    updated_at: "2026-01-01T00:00:00Z",
    uuid: `00000000-0000-4000-8000-${String(overrides.id ?? 1).padStart(12, "0")}`,
    ...overrides,
  };
}
