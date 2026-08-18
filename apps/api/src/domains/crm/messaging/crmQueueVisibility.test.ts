import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { resolveCrmQueueVisibility } from "./crmQueueVisibility.js";

function systemContext(permissions: string[]) {
  return createServiceContext({
    actor: { id: "queue_worker", kind: "system" },
    permissions,
    request: { requestId: "queue_visibility_test" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

describe("resolveCrmQueueVisibility", () => {
  it("denies queue rows to a non-user actor without assign permission", () => {
    expect(
      resolveCrmQueueVisibility(systemContext(["crm.conversations.read"])),
    ).toEqual({ kind: "none" });
  });

  it("keeps global visibility explicit for an authorized system actor", () => {
    expect(
      resolveCrmQueueVisibility(
        systemContext(["crm.conversations.read", "crm.conversations.assign"]),
      ),
    ).toEqual({ kind: "global" });
  });
});
