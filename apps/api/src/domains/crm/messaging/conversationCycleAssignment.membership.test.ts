import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { createTestCrmConversationCycle } from "../testSupportWhatsapp.js";
import { applyConversationCycleAssignment } from "./conversationCycleAssignment.js";

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
      const updateConversationCycle = vi.fn();
      const updateLead = vi.fn();
      const initial = createTestCrmConversationCycle({ leadId: "lead-1" });
      const ports = assignmentPorts({
        isActiveStoreMember: async (input) =>
          input.tenantId === membershipTenantId &&
          input.storeId === membershipStoreId &&
          input.userId === membershipUserId &&
          status === "active" &&
          !isDeleted,
        updateLead,
        updateConversationCycle,
      });

      await expect(
        applyConversationCycleAssignment({
          allowReassignment: true,
          assignedAt: new Date("2026-08-18T12:00:00.000Z"),
          assignedUserId: "assignee-1",
          initialSession: initial,
          ports,
          scope: { storeId: "store-1", tenantId: "tenant-1" },
        }),
      ).rejects.toThrow(AuthorizationError);
      expect(updateConversationCycle).not.toHaveBeenCalled();
      expect(updateLead).not.toHaveBeenCalled();
    },
  );

  it("allows the exact active member and keeps linked writes together", async () => {
    const initial = createTestCrmConversationCycle({ leadId: "lead-1" });
    const assigned = createTestCrmConversationCycle({
      ...initial,
      assignedUserId: "assignee-1" as never,
      revision: initial.revision + 1,
    });
    const updateConversationCycle = vi.fn(async () => assigned);
    const updateLead = vi.fn(async () => ({ id: "lead-1" }));
    const isActiveStoreMember = vi.fn(async () => true);

    await expect(
      applyConversationCycleAssignment({
        allowReassignment: true,
        assignedAt: new Date("2026-08-18T12:00:00.000Z"),
        assignedUserId: "assignee-1",
        initialSession: initial,
        ports: assignmentPorts({
          isActiveStoreMember,
          updateLead,
          updateConversationCycle,
        }),
        scope: { storeId: "store-1", tenantId: "tenant-1" },
      }),
    ).resolves.toMatchObject({ result: "applied" });
    expect(isActiveStoreMember).toHaveBeenCalledWith({
      storeId: "store-1",
      tenantId: "tenant-1",
      userId: "assignee-1",
    });
    expect(updateConversationCycle).toHaveBeenCalledTimes(1);
    expect(updateLead).toHaveBeenCalledTimes(1);
  });
});

function assignmentPorts(input: {
  isActiveStoreMember: NonNullable<
    CrmServicePorts["crmAssigneeMembershipRepository"]
  >["isActiveStoreMember"];
  updateLead: ReturnType<typeof vi.fn>;
  updateConversationCycle: ReturnType<typeof vi.fn>;
}): CrmServicePorts {
  return {
    crmAssigneeMembershipRepository: {
      isActiveStoreMember: input.isActiveStoreMember,
    },
    crmRepository: { updateLead: input.updateLead } as never,
    crmConversationRepository: {
      updateConversationCycle: input.updateConversationCycle,
    } as never,
  };
}
