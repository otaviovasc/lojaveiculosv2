import assert from "node:assert/strict";
import test from "node:test";
import {
  assertWhatsappLeadCoverage,
  buildAgentUserMap,
  findAssignedUserId,
} from "./target-crm-whatsapp-support.mjs";
import { groupWhatsappSessions } from "./crm-whatsapp-mapping.mjs";

test("rejects missing linked V2 leads before replacing WhatsApp history", async () => {
  const tx = () => Promise.resolve([]);
  await assert.rejects(
    () =>
      assertWhatsappLeadCoverage(
        tx,
        {
          leads: [{ crm_session_id: 44, id: 10, phone: null }],
        },
        groupWhatsappSessions([
          {
            buyer_chat_lid: null,
            buyer_phone: "5544999990000",
            created_at: "2026-01-01T00:00:00Z",
            id: 44,
            last_message_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ]),
        {
          leads: new Map([[10, "00000000-0000-4000-8000-000000000010"]]),
          store: "00000000-0000-4000-8000-000000000001",
        },
      ),
    /Include the leads module.*before WhatsApp/,
  );
});

test("maps Repasses agents by Clerk id and prompted access email", () => {
  const agents = [
    { clerk_user_id: "clerk-owner", email: null, id: 30 },
    { clerk_user_id: null, email: "seller@example.com", id: 31 },
  ];
  const data = {
    accesses: [
      { clerkUserId: "clerk-owner", id: 10, profile: {} },
      { clerkUserId: "clerk-seller", id: 11, profile: {} },
    ],
  };
  const ids = {
    users: new Map([
      ["clerk-owner", "v2-owner"],
      ["clerk-seller", "v2-seller"],
    ]),
  };
  const mapped = buildAgentUserMap(
    agents,
    data,
    ids,
    new Map([[11, "seller@example.com"]]),
  );
  assert.equal(mapped.get(30), "v2-owner");
  assert.equal(mapped.get(31), "v2-seller");
});

test("prefers the canonical session assignment", () => {
  const canonical = { assigned_agent_id: 30 };
  const group = {
    canonical,
    members: [canonical, { assigned_agent_id: 31 }],
  };
  assert.equal(
    findAssignedUserId(
      group,
      new Map([
        [30, "v2-owner"],
        [31, "v2-seller"],
      ]),
    ),
    "v2-owner",
  );
});
