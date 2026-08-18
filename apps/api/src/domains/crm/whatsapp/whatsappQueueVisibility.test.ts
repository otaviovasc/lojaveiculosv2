import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { resolveWhatsappQueueVisibility } from "./whatsappQueueVisibility.js";

function systemContext(permissions: string[]) {
  return createServiceContext({
    actor: { id: "queue_worker", kind: "system" },
    permissions,
    request: { requestId: "queue_visibility_test" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

describe("resolveWhatsappQueueVisibility", () => {
  it("denies queue rows to a non-user actor without assign permission", () => {
    expect(
      resolveWhatsappQueueVisibility(systemContext(["crm.whatsapp.list"])),
    ).toEqual({ kind: "none" });
  });

  it("keeps global visibility explicit for an authorized system actor", () => {
    expect(
      resolveWhatsappQueueVisibility(
        systemContext(["crm.whatsapp.list", "crm.whatsapp.assign"]),
      ),
    ).toEqual({ kind: "global" });
  });
});
