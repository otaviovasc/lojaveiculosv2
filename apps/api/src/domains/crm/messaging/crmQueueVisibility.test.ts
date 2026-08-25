import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { resolveCrmQueueVisibility } from "./crmQueueVisibility.js";

function context(input: {
  actor: { id: string; kind: "system" | "user" };
  permissions: string[];
}) {
  return createServiceContext({
    actor: input.actor,
    permissions: input.permissions,
    request: { requestId: "queue_visibility_test" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

describe("resolveCrmQueueVisibility", () => {
  it("denies queue rows to a non-user actor without assign permission", () => {
    expect(
      resolveCrmQueueVisibility(
        context({
          actor: { id: "queue_worker", kind: "system" },
          permissions: ["crm.conversations.read"],
        }),
      ),
    ).toEqual({ kind: "none" });
  });

  it("limits a user without global queue permission to assigned conversations", () => {
    expect(
      resolveCrmQueueVisibility(
        context({
          actor: { id: "user_1", kind: "user" },
          permissions: ["crm.conversations.read"],
        }),
      ),
    ).toEqual({ kind: "assigned", userId: "user_1" });
  });

  it("grants global visibility without assignment authority", () => {
    expect(
      resolveCrmQueueVisibility(
        context({
          actor: { id: "user_1", kind: "user" },
          permissions: [
            "crm.conversations.read",
            "crm.conversations.read_unassigned",
          ],
        }),
      ),
    ).toEqual({ kind: "global" });
  });

  it("keeps global visibility explicit for an authorized system actor", () => {
    expect(
      resolveCrmQueueVisibility(
        context({
          actor: { id: "queue_worker", kind: "system" },
          permissions: ["crm.conversations.read", "crm.conversations.assign"],
        }),
      ),
    ).toEqual({ kind: "global" });
  });
});
