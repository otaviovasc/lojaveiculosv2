import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAgentUserMap,
  findAssignedUserId,
} from "./target-crm-whatsapp-support.mjs";

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
