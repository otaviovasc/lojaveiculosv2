import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { createTestCrmWhatsappSession } from "../testSupportWhatsapp.js";
import { applyWhatsappSessionAssignment } from "./whatsappSessionAssignment.js";

describe("CRM WhatsApp assignee membership", () => {
  it.each([
    ["foreign tenant", "tenant-2", "store-1", "assignee-1", "active", false],
    ["foreign store", "tenant-1", "store-2", "assignee-1", "active", false],
    ["suspended", "tenant-1", "store-1", "assignee-1", "suspended", false],
    ["invited", "tenant-1", "store-1", "assignee-1", "invited", false],
    ["deleted", "tenant-1", "store-1", "assignee-1", "active", true],
  ] as const)(
    "rejects a %s assignee before writes",
    async (
      _case,
      membershipTenantId,
      membershipStoreId,
      membershipUserId,
      status,
      isDeleted,
    ) => {
      const updateSession = vi.fn();
      const updateLead = vi.fn();
      const initial = createTestCrmWhatsappSession({ leadId: "lead-1" });
      const ports = assignmentPorts({
        isActiveStoreMember: async (input) =>
          input.tenantId === membershipTenantId &&
          input.storeId === membershipStoreId &&
          input.userId === membershipUserId &&
          status === "active" &&
          !isDeleted,
        updateLead,
        updateSession,
      });

      await expect(
        applyWhatsappSessionAssignment({
          allowReassignment: true,
          assignedAt: new Date("2026-08-18T12:00:00.000Z"),
          assignedUserId: "assignee-1",
          initialSession: initial,
          ports,
          scope: { storeId: "store-1", tenantId: "tenant-1" },
        }),
      ).rejects.toThrow(AuthorizationError);
      expect(updateSession).not.toHaveBeenCalled();
      expect(updateLead).not.toHaveBeenCalled();
    },
  );

  it("allows the exact active member and keeps linked writes together", async () => {
    const initial = createTestCrmWhatsappSession({ leadId: "lead-1" });
    const assigned = createTestCrmWhatsappSession({
      ...initial,
      assignedUserId: "assignee-1" as never,
      revision: initial.revision + 1,
    });
    const updateSession = vi.fn(async () => assigned);
    const updateLead = vi.fn(async () => ({ id: "lead-1" }));
    const isActiveStoreMember = vi.fn(async () => true);

    await expect(
      applyWhatsappSessionAssignment({
        allowReassignment: true,
        assignedAt: new Date("2026-08-18T12:00:00.000Z"),
        assignedUserId: "assignee-1",
        initialSession: initial,
        ports: assignmentPorts({
          isActiveStoreMember,
          updateLead,
          updateSession,
        }),
        scope: { storeId: "store-1", tenantId: "tenant-1" },
      }),
    ).resolves.toMatchObject({ result: "applied" });
    expect(isActiveStoreMember).toHaveBeenCalledWith({
      storeId: "store-1",
      tenantId: "tenant-1",
      userId: "assignee-1",
    });
    expect(updateSession).toHaveBeenCalledTimes(1);
    expect(updateLead).toHaveBeenCalledTimes(1);
  });
});

function assignmentPorts(input: {
  isActiveStoreMember: NonNullable<
    CrmServicePorts["crmAssigneeMembershipRepository"]
  >["isActiveStoreMember"];
  updateLead: ReturnType<typeof vi.fn>;
  updateSession: ReturnType<typeof vi.fn>;
}): CrmServicePorts {
  return {
    crmAssigneeMembershipRepository: {
      isActiveStoreMember: input.isActiveStoreMember,
    },
    crmRepository: { updateLead: input.updateLead } as never,
    crmWhatsappRepository: { updateSession: input.updateSession } as never,
  };
}
