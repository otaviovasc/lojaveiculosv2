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
          actorId: "actor-1",
          actorKind: "user",
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
        actorId: "actor-1",
        actorKind: "user",
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

  it("returns an active human conversation to the waiting queue when unassigned", async () => {
    const assignedAt = new Date("2026-08-18T12:00:00.000Z");
    const initial = createTestCrmConversationCycle({
      assignedUserId: "assignee-1" as never,
      humanAttendanceChangedAt: new Date("2026-08-18T11:59:00.000Z"),
      humanAttendanceState: "IN_HUMAN_SERVICE",
      humanAttendanceStateVersion: 1,
      humanHandlingStartedAt: new Date("2026-08-18T11:59:00.000Z"),
      humanTakeoverAt: new Date("2026-08-18T11:58:00.000Z"),
      interventionId: "intervention-1",
      status: "HUMAN_TAKEOVER",
    });
    const waiting = createTestCrmConversationCycle({
      ...initial,
      assignedUserId: null,
      humanAttendanceChangedAt: assignedAt,
      humanAttendanceState: "WAITING_HUMAN",
      humanAttendanceStateVersion: 2,
      humanHandlingStartedAt: null,
      revision: initial.revision + 1,
    });
    const updateConversationCycle = vi.fn();
    const transitionAttendance = vi.fn(async () => ({
      conversationCycle: waiting,
      transitionCreated: true,
    }));

    await expect(
      applyConversationCycleAssignment({
        actorId: "actor-1",
        actorKind: "user",
        allowReassignment: true,
        assignedAt,
        assignedUserId: null,
        initialSession: initial,
        ports: assignmentPorts({
          isActiveStoreMember: vi.fn(),
          transitionAttendance,
          updateLead: vi.fn(),
          updateConversationCycle,
        }),
        scope: { storeId: "store-1", tenantId: "tenant-1" },
      }),
    ).resolves.toMatchObject({
      result: "applied",
      conversationCycle: {
        assignedUserId: null,
        humanAttendanceState: "WAITING_HUMAN",
      },
    });
    expect(updateConversationCycle).not.toHaveBeenCalled();
    expect(transitionAttendance).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "actor-1",
        actorKind: "user",
        assignedUserId: null,
        cycleId: initial.id,
        expectedRevision: initial.revision,
        humanAttendanceState: "WAITING_HUMAN",
        humanAttendanceStateVersion: 2,
        nextState: "WAITING_HUMAN",
        previousState: "IN_HUMAN_SERVICE",
        reason: "assignee_removed",
        source: "crm_assignment",
        storeId: "store-1",
        tenantId: "tenant-1",
      }),
    );
  });
});

function assignmentPorts(input: {
  isActiveStoreMember: NonNullable<
    CrmServicePorts["crmAssigneeMembershipRepository"]
  >["isActiveStoreMember"];
  updateLead: ReturnType<typeof vi.fn>;
  updateConversationCycle: ReturnType<typeof vi.fn>;
  transitionAttendance?: ReturnType<typeof vi.fn>;
}): CrmServicePorts {
  return {
    crmAssigneeMembershipRepository: {
      isActiveStoreMember: input.isActiveStoreMember,
    },
    crmRepository: { updateLead: input.updateLead } as never,
    crmConversationRepository: {
      transitionAttendance: input.transitionAttendance,
      updateConversationCycle: input.updateConversationCycle,
    } as never,
  };
}
