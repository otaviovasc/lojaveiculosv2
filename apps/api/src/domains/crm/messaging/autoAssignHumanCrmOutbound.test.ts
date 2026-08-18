import type { AuditEvent } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createTestCrmConversationCycle } from "../testSupportWhatsapp.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";
import { applyConversationCycleAssignment } from "./conversationCycleAssignment.js";
import {
  autoAssignHumanCrmOutbound,
  shouldAutoAssignHumanCrmOutbound,
} from "./autoAssignHumanCrmOutbound.js";

describe("CRM automatic outbound assignment", () => {
  it.each([
    ["HUMAN", "human_crm", true],
    ["HUMAN", "human_channel", false],
    ["AI", "external_bot", false],
    ["SYSTEM", "human_crm", false],
    ["HUMAN", "system", false],
    ["SYSTEM", "system", false],
  ] as const)(
    "evaluates %s/%s eligibility",
    (senderType, senderOrigin, expected) => {
      expect(
        shouldAutoAssignHumanCrmOutbound({ senderOrigin, senderType }),
      ).toBe(expected);
    },
  );

  it("preserves a concurrent assignee after a CAS conflict", async () => {
    const initial = createTestCrmConversationCycle({
      id: "conversationCycle-race",
      leadId: "lead-race",
    });
    const concurrent = createTestCrmConversationCycle({
      assignedUserId: "other-user" as never,
      id: initial.id,
      leadId: initial.leadId,
      revision: initial.revision + 1,
    });
    const updateLead = vi.fn();
    const updateConversationCycle = vi.fn(async () => null);
    const ports: CrmServicePorts = {
      crmAssigneeMembershipRepository: {
        isActiveStoreMember: async () => true,
      },
      crmRepository: { updateLead } as never,
      crmConversationRepository: {
        listConversationCycles: vi.fn(async () => [concurrent]),
        updateConversationCycle,
      } as never,
    };

    const result = await applyConversationCycleAssignment({
      allowReassignment: false,
      assignedAt: new Date("2026-08-17T12:00:00.000Z"),
      assignedUserId: "sending-user",
      initialSession: initial,
      ports,
      scope: { storeId: initial.storeId, tenantId: initial.tenantId },
    });

    expect(result).toMatchObject({
      result: "superseded",
      conversationCycle: { assignedUserId: "other-user", revision: 1 },
    });
    expect(updateConversationCycle).toHaveBeenCalledTimes(1);
    expect(updateLead).not.toHaveBeenCalled();
  });

  it("records attempted and succeeded evidence for an applied assignment", async () => {
    const initial = activeHumanSession();
    const assigned = createTestCrmConversationCycle({
      ...initial,
      assignedUserId: "sending-user" as never,
      revision: initial.revision + 1,
    });
    const updateConversationCycle = vi.fn(async () => assigned);
    const ports = transactionalPorts({ updateConversationCycle } as never);
    const audit = auditSpy();

    await expect(
      autoAssignHumanCrmOutbound(automaticInput(initial, ports, audit.context)),
    ).resolves.toMatchObject({ assignment: { result: "applied" } });

    expect(audit.events()).toMatchObject([
      { metadata: { result: "attempted" }, outcome: "attempted" },
      { metadata: { result: "applied" }, outcome: "succeeded" },
    ]);
    expect(ports.transactionCalls()).toBe(1);
  });

  it("records no-change evidence without stealing an existing assignment", async () => {
    const initial = activeHumanSession({
      assignedUserId: "other-user" as never,
    });
    const updateConversationCycle = vi.fn();
    const ports = transactionalPorts({ updateConversationCycle } as never);
    const audit = auditSpy();

    await expect(
      autoAssignHumanCrmOutbound(automaticInput(initial, ports, audit.context)),
    ).resolves.toMatchObject({
      assignment: {
        result: "superseded",
        conversationCycle: { assignedUserId: "other-user" },
      },
    });

    expect(updateConversationCycle).not.toHaveBeenCalled();
    expect(audit.events()).toMatchObject([
      { outcome: "attempted" },
      { metadata: { result: "superseded" }, outcome: "succeeded" },
    ]);
  });

  it("records already-present evidence for the current assignee", async () => {
    const initial = activeHumanSession({
      assignedUserId: "sending-user" as never,
    });
    const updateConversationCycle = vi.fn();
    const ports = transactionalPorts({ updateConversationCycle } as never);
    const audit = auditSpy();

    await expect(
      autoAssignHumanCrmOutbound(automaticInput(initial, ports, audit.context)),
    ).resolves.toMatchObject({
      assignment: { result: "already_applied" },
    });

    expect(updateConversationCycle).not.toHaveBeenCalled();
    expect(audit.events()).toMatchObject([
      { outcome: "attempted" },
      { metadata: { result: "already_present" }, outcome: "succeeded" },
    ]);
  });

  it("records failed evidence when the transaction fails", async () => {
    const initial = activeHumanSession();
    const audit = auditSpy();
    const ports = transactionalPorts({} as never);
    ports.transaction = vi.fn(async () => {
      throw new TypeError("assignment transaction failed");
    });

    await expect(
      autoAssignHumanCrmOutbound(automaticInput(initial, ports, audit.context)),
    ).rejects.toThrow("assignment transaction failed");
    expect(audit.events()).toMatchObject([
      { outcome: "attempted" },
      {
        metadata: { errorName: "TypeError", result: "failed" },
        outcome: "failed",
      },
    ]);
  });
});

function activeHumanSession(
  overrides: Parameters<typeof createTestCrmConversationCycle>[0] = {},
) {
  return createTestCrmConversationCycle({
    humanAttendanceState: "IN_HUMAN_SERVICE",
    humanAttendanceStateVersion: 1,
    interventionId: "outbound-intent-1",
    status: "HUMAN_TAKEOVER",
    ...overrides,
  });
}

function transactionalPorts(
  crmConversationRepository: NonNullable<
    CrmServicePorts["crmConversationRepository"]
  >,
) {
  let transactionCalls = 0;
  const ports: CrmServicePorts & { transactionCalls: () => number } = {
    crmAssigneeMembershipRepository: {
      isActiveStoreMember: async () => true,
    },
    crmRepository: {} as never,
    crmConversationRepository,
    transactionCalls: () => transactionCalls,
  };
  ports.transaction = async <T>(
    action: (transactionPorts: CrmServicePorts) => Promise<T>,
  ): Promise<T> => {
    transactionCalls += 1;
    return action(ports);
  };
  return ports;
}

function automaticInput(
  conversationCycle: ReturnType<typeof createTestCrmConversationCycle>,
  ports: CrmServicePorts,
  context: ReturnType<typeof createServiceContext>,
) {
  return {
    context,
    outboundIntentId: "outbound-intent-1",
    ports,
    providerTimestamp: new Date("2026-08-17T12:00:00.000Z"),
    scope: {
      storeId: conversationCycle.storeId,
      tenantId: conversationCycle.tenantId,
    },
    senderOrigin: "human_crm" as const,
    senderType: "HUMAN" as const,
    conversationCycle,
  };
}

function auditSpy() {
  const record = vi.fn(async (_event: AuditEvent) => undefined);
  const context = createServiceContext({
    actor: { id: "sending-user", kind: "user" },
    audit: { record },
    permissions: ["crm.messages.send"],
    request: { requestId: "request-auto-assignment" },
    storeId: "store-1",
    tenantId: "tenant-1",
  });
  return {
    context,
    events: () => record.mock.calls.map(([event]) => event),
  };
}
