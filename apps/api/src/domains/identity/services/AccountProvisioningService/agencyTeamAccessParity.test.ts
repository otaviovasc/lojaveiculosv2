import { describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { AccountProvisioningPorts } from "./serviceSupport.js";
import { inviteStoreMember } from "./inviteStoreMember.js";
import { resendInvitation } from "./resendInvitation.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const userId = "user_agency" as UserId;

describe("agency team access invitation parity", () => {
  it("uses the validated virtual agency role when inviting across its stores", async () => {
    const ports = createPorts();

    const result = await inviteStoreMember(
      agencyStoreContext(),
      { email: "seller@example.com", name: "Seller", role: "salesman" },
      ports,
    );

    expect(
      ports.accountProvisioningRepository.findActiveStoreRole,
    ).not.toHaveBeenCalled();
    expect(
      ports.accountProvisioningRepository.createStoreInvitation,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ role: "salesman", storeId, tenantId }),
    );
    expect(result.acceptUrl).toBe("https://example.test/accept");
  });

  it("resends only when the validated agency context matches invitation scope", async () => {
    const ports = createPorts();

    await resendInvitation(
      agencyStoreContext(),
      {
        clerkUserId: "clerk_agency",
        email: "agency@example.com",
        emailVerified: true,
        name: "Agency",
      },
      { invitationId: "invitation_1" },
      ports,
    );

    expect(
      ports.accountProvisioningRepository.hasStorePermission,
    ).not.toHaveBeenCalled();
    expect(ports.invitationSender.send).toHaveBeenCalledWith(
      expect.objectContaining({ invitationId: "invitation_1" }),
    );
  });
});

function agencyStoreContext() {
  return createServiceContext({
    actor: {
      externalId: "clerk_agency",
      id: userId,
      kind: "user",
    },
    membershipRole: "agency",
    permissions: ["users.manage"],
    request: { requestId: "req_agency_team" },
    storeId,
    tenantId,
  });
}

function createPorts(): AccountProvisioningPorts {
  const invitation = {
    email: "seller@example.com",
    id: "invitation_1",
    role: "salesman" as const,
    status: "sent" as const,
    storeId,
    tenantId,
  };
  return {
    accountProvisioningRepository: {
      createStoreInvitation: vi.fn(async () => invitation),
      ensureUser: vi.fn(async () => ({
        clerkUserId: "clerk_agency",
        email: "agency@example.com",
        id: userId,
        name: "Agency",
      })),
      findActiveStoreRole: vi.fn(async () => null),
      findInvitationById: vi.fn(async () => invitation),
      hasStorePermission: vi.fn(async () => false),
      markInvitationSendFailed: vi.fn(async () => true),
      markInvitationSent: vi.fn(async () => true),
    } as never,
    invitationSender: {
      send: vi.fn(async () => ({
        acceptUrl: "https://example.test/accept",
        clerkInvitationId: "clerk_invitation_1",
      })),
    },
  };
}
