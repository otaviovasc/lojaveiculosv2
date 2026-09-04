import { describe, expect, it, vi } from "vitest";
import type {
  CrmConversationRepository,
  CrmConversationCycle,
} from "../ports/crmConversationRepository.js";
import { createTestCrmConversationCycle } from "../testSupportWhatsapp.js";
import { transitionConfirmedHumanOutboundAttendance } from "./outboundAttendance.js";

const providerTimestamp = new Date("2026-08-10T15:00:00.000Z");

describe("transitionConfirmedHumanOutboundAttendance", () => {
  it("queues for a human (WAITING_HUMAN) when a device message has no assignee", async () => {
    const cycle = createTestCrmConversationCycle({ assignedUserId: null });
    const repository = createFakeRepository(cycle);

    const result = await transitionConfirmedHumanOutboundAttendance({
      actorId: "provider-1",
      actorKind: "provider",
      conversationCycle: cycle,
      interventionId: "intervention-1",
      providerTimestamp,
      reason: "human_channel_message",
      repository,
      senderOrigin: "human_channel",
      senderType: "HUMAN",
    });

    expect(result.changed).toBe(true);
    expect(result.conversationCycle).toMatchObject({
      assignedUserId: null,
      humanAttendanceState: "WAITING_HUMAN",
      humanHandlingStartedAt: null,
      status: "HUMAN_TAKEOVER",
    });
    expect(repository.transitionAttendance).toHaveBeenCalledWith(
      expect.objectContaining({
        nextState: "WAITING_HUMAN",
        previousState: null,
        reason: "human_channel_message",
      }),
    );
  });

  it("keeps IN_HUMAN_SERVICE for a device message when the conversation has an assignee", async () => {
    const cycle = createTestCrmConversationCycle({
      assignedUserId: "user-1" as never,
    });
    const repository = createFakeRepository(cycle);

    const result = await transitionConfirmedHumanOutboundAttendance({
      actorId: "provider-1",
      actorKind: "provider",
      conversationCycle: cycle,
      interventionId: "intervention-1",
      providerTimestamp,
      reason: "human_channel_message",
      repository,
      senderOrigin: "human_channel",
      senderType: "HUMAN",
    });

    expect(result.changed).toBe(true);
    expect(result.conversationCycle).toMatchObject({
      assignedUserId: "user-1",
      humanAttendanceState: "IN_HUMAN_SERVICE",
      humanHandlingStartedAt: providerTimestamp,
      status: "HUMAN_TAKEOVER",
    });
  });

  it("keeps IN_HUMAN_SERVICE for the CRM sender (auto-assign happens upstream)", async () => {
    const cycle = createTestCrmConversationCycle({
      assignedUserId: "user-1" as never,
    });
    const repository = createFakeRepository(cycle);

    const result = await transitionConfirmedHumanOutboundAttendance({
      actorId: "user-1",
      actorKind: "user",
      conversationCycle: cycle,
      interventionId: "intervention-1",
      providerTimestamp,
      repository,
      senderOrigin: "human_crm",
      senderType: "HUMAN",
    });

    expect(result.changed).toBe(true);
    expect(result.conversationCycle.humanAttendanceState).toBe(
      "IN_HUMAN_SERVICE",
    );
  });

  it("does not churn a conversation already waiting for a human", async () => {
    const cycle = createTestCrmConversationCycle({
      assignedUserId: null,
      humanAttendanceChangedAt: providerTimestamp,
      humanAttendanceState: "WAITING_HUMAN",
      humanAttendanceStateVersion: 1,
      humanTakeoverAt: providerTimestamp,
      interventionId: "intervention-1",
      status: "HUMAN_TAKEOVER",
    });
    const repository = createFakeRepository(cycle);

    const result = await transitionConfirmedHumanOutboundAttendance({
      actorId: "provider-1",
      actorKind: "provider",
      conversationCycle: cycle,
      interventionId: "intervention-1",
      providerTimestamp,
      reason: "human_channel_message",
      repository,
      senderOrigin: "human_channel",
      senderType: "HUMAN",
    });

    expect(result.changed).toBe(false);
    expect(repository.transitionAttendance).not.toHaveBeenCalled();
  });

  it("acknowledges an AI pause when the seller sends through CRM", async () => {
    const cycle = createTestCrmConversationCycle({
      assignedUserId: "user-1" as never,
      humanAttendanceState: "WAITING_HUMAN",
      humanAttendanceStateVersion: 1,
      humanTakeoverAt: new Date("2026-08-10T14:00:00.000Z"),
      interventionId: "ai-intervention",
      metadata: { humanAttendance: { active: true, source: "ai_request" } },
      status: "HUMAN_TAKEOVER",
    });
    const result = await transitionConfirmedHumanOutboundAttendance({
      actorId: "user-1",
      actorKind: "user",
      conversationCycle: cycle,
      interventionId: "outbound-1",
      providerTimestamp,
      repository: createFakeRepository(cycle),
      senderOrigin: "human_crm",
      senderType: "HUMAN",
    });
    expect(result.changed).toBe(true);
    expect(result.conversationCycle).toMatchObject({
      humanAttendanceState: "IN_HUMAN_SERVICE",
      humanAttendanceStateVersion: 2,
      interventionId: "ai-intervention",
      humanTakeoverAt: cycle.humanTakeoverAt,
    });
  });

  it("ignores non-human senders", async () => {
    const cycle = createTestCrmConversationCycle();
    const repository = createFakeRepository(cycle);

    const result = await transitionConfirmedHumanOutboundAttendance({
      actorId: "bot-1",
      actorKind: "bot",
      conversationCycle: cycle,
      interventionId: "intervention-1",
      providerTimestamp,
      repository,
      senderOrigin: "external_bot",
      senderType: "AI",
    });

    expect(result.changed).toBe(false);
    expect(repository.transitionAttendance).not.toHaveBeenCalled();
  });
});

function createFakeRepository(current: CrmConversationCycle) {
  return {
    listConversationCycles: vi.fn(),
    transitionAttendance: vi.fn(async (input: Record<string, unknown>) => {
      const {
        actorId: _actorId,
        actorKind: _actorKind,
        cycleId: _cycleId,
        expectedHumanAttendanceStateVersion: _v1,
        expectedInterventionId: _v2,
        expectedRevision: _v3,
        expectedStatus: _v4,
        idempotencyKey: _v5,
        interventionIdForLedger: _v6,
        nextState: _v7,
        occurredAt: _v8,
        previousState: _v9,
        reason: _v10,
        requestFingerprint: _v11,
        source: _v12,
        ...update
      } = input;
      return {
        conversationCycle: {
          ...current,
          ...update,
        } as CrmConversationCycle,
        transitionCreated: true,
      };
    }),
    updateConversationCycle: vi.fn(),
  } as unknown as CrmConversationRepository & {
    transitionAttendance: ReturnType<typeof vi.fn>;
  };
}
