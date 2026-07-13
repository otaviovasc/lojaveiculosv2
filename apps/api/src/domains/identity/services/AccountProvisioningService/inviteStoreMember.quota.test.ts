import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { AccountProvisioningPorts } from "./serviceSupport.js";
import { inviteStoreMember } from "./inviteStoreMember.js";

describe("inviteStoreMember quota", () => {
  it("rejects before creating or sending an invitation when seats are exhausted", async () => {
    const quotaGuard = {
      assertAvailable: vi.fn().mockRejectedValue(new Error("quota exceeded")),
    };
    const repository = {
      createStoreInvitation: vi.fn(),
      findActiveStoreRole: vi.fn().mockResolvedValue("owner"),
    };
    const ports = {
      accountProvisioningRepository: repository,
      invitationSender: { send: vi.fn() },
      quotaGuard,
    } as unknown as AccountProvisioningPorts;
    const context = createServiceContext({
      actor: { id: "user_1", kind: "user" },
      permissions: ["users.manage"],
      request: { requestId: "req_quota" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    await expect(
      inviteStoreMember(
        context,
        { email: "seller@example.com", role: "salesman" },
        ports,
      ),
    ).rejects.toThrow("quota exceeded");

    expect(repository.createStoreInvitation).not.toHaveBeenCalled();
  });
});
