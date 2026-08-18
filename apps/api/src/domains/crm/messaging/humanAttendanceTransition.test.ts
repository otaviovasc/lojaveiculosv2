import { describe, expect, it } from "vitest";
import { createTestCrmConversationCycle } from "../testSupportWhatsapp.js";
import { humanAttendanceUpdate } from "./humanAttendanceTransition.js";

const now = new Date("2026-08-10T15:00:00.000Z");

function conversationCycle() {
  return createTestCrmConversationCycle();
}

describe("human attendance transitions", () => {
  it("starts an AI pause as waiting for a human", () => {
    const update = humanAttendanceUpdate(
      conversationCycle(),
      {
        interventionId: "00000000-0000-4000-8000-000000000001",
        kind: "start",
        reason: "KEYWORD_TRIGGER",
        source: "bot",
        state: "WAITING_HUMAN",
      },
      now,
    );

    expect(update).toMatchObject({
      humanAttendanceChangedAt: now,
      humanAttendanceState: "WAITING_HUMAN",
      humanAttendanceStateVersion: 1,
      humanHandlingStartedAt: null,
      interventionId: "00000000-0000-4000-8000-000000000001",
      status: "HUMAN_TAKEOVER",
    });
  });

  it("acknowledges waiting only once after a human outbound", () => {
    const waiting = {
      ...conversationCycle(),
      humanAttendanceChangedAt: new Date("2026-08-10T14:30:00.000Z"),
      humanAttendanceState: "WAITING_HUMAN" as const,
      humanAttendanceStateVersion: 1,
      humanTakeoverAt: new Date("2026-08-10T14:30:00.000Z"),
      interventionId: "00000000-0000-4000-8000-000000000001",
      status: "HUMAN_TAKEOVER" as const,
    };
    const update = humanAttendanceUpdate(
      waiting,
      {
        kind: "start",
        reason: "human_outbound_message",
        source: "admin",
        state: "IN_HUMAN_SERVICE",
      },
      now,
    );

    expect(update).toMatchObject({
      humanAttendanceState: "IN_HUMAN_SERVICE",
      humanAttendanceStateVersion: 2,
      humanHandlingStartedAt: now,
      interventionId: waiting.interventionId,
    });
    expect(
      humanAttendanceUpdate(
        { ...waiting, ...update },
        {
          kind: "start",
          reason: "human_outbound_message",
          source: "admin",
          state: "IN_HUMAN_SERVICE",
        },
        now,
      ),
    ).toBeNull();
  });

  it("ignores a stale intervention id and clears the active generation", () => {
    const active = {
      ...conversationCycle(),
      humanAttendanceChangedAt: now,
      humanAttendanceState: "WAITING_HUMAN" as const,
      humanAttendanceStateVersion: 1,
      humanTakeoverAt: now,
      interventionId: "00000000-0000-4000-8000-000000000001",
      status: "HUMAN_TAKEOVER" as const,
    };
    expect(
      humanAttendanceUpdate(
        active,
        {
          interventionId: "00000000-0000-4000-8000-000000000002",
          kind: "clear",
          status: "MINIBOT_ACTIVE",
        },
        now,
      ),
    ).toBeNull();
    expect(
      humanAttendanceUpdate(
        active,
        {
          interventionId: active.interventionId,
          kind: "clear",
          status: "MINIBOT_ACTIVE",
        },
        now,
      ),
    ).toMatchObject({
      humanAttendanceChangedAt: now,
      humanAttendanceState: null,
      humanAttendanceStateVersion: 2,
      humanHandlingStartedAt: null,
      humanTakeoverAt: null,
      interventionId: null,
      status: "MINIBOT_ACTIVE",
    });
  });

  it("continues the conversationCycle version after a cleared intervention", () => {
    const tombstone = {
      ...conversationCycle(),
      humanAttendanceChangedAt: new Date("2026-08-10T14:50:00.000Z"),
      humanAttendanceStateVersion: 3,
      status: "MINIBOT_ACTIVE" as const,
    };

    expect(
      humanAttendanceUpdate(
        tombstone,
        {
          interventionId: "00000000-0000-4000-8000-000000000004",
          kind: "start",
          reason: "KEYWORD_TRIGGER",
          source: "bot",
          state: "WAITING_HUMAN",
        },
        now,
      ),
    ).toMatchObject({
      humanAttendanceState: "WAITING_HUMAN",
      humanAttendanceStateVersion: 4,
      interventionId: "00000000-0000-4000-8000-000000000004",
      status: "HUMAN_TAKEOVER",
    });
  });

  it("does not reopen an ended intervention from a delayed retry", () => {
    const interventionId = "00000000-0000-4000-8000-000000000011";
    const initial = conversationCycle();
    const started = humanAttendanceUpdate(
      initial,
      {
        interventionId,
        kind: "start",
        reason: "KEYWORD_TRIGGER",
        source: "bot",
        state: "WAITING_HUMAN",
      },
      now,
    );
    expect(started).not.toBeNull();
    const active = { ...initial, ...started };
    const cleared = humanAttendanceUpdate(
      active,
      { interventionId, kind: "clear", status: "MINIBOT_ACTIVE" },
      new Date("2026-08-10T15:05:00.000Z"),
    );
    expect(cleared).not.toBeNull();
    const ended = { ...active, ...cleared };
    const laterStatusChange = humanAttendanceUpdate(
      ended,
      { kind: "clear", status: "COMPLETED" },
      new Date("2026-08-10T16:00:00.000Z"),
    );
    expect(laterStatusChange).toMatchObject({
      humanAttendanceChangedAt: ended.humanAttendanceChangedAt,
      humanAttendanceStateVersion: ended.humanAttendanceStateVersion,
      metadata: ended.metadata,
      status: "COMPLETED",
    });
    expect(laterStatusChange?.metadata).toBe(ended.metadata);

    expect(
      humanAttendanceUpdate(
        ended,
        {
          interventionId,
          kind: "start",
          reason: "KEYWORD_TRIGGER",
          source: "bot",
          state: "WAITING_HUMAN",
        },
        new Date("2026-08-10T15:06:00.000Z"),
      ),
    ).toBeNull();
    expect(
      humanAttendanceUpdate(
        ended,
        {
          interventionId: "00000000-0000-4000-8000-000000000012",
          kind: "start",
          reason: "KEYWORD_TRIGGER",
          source: "bot",
          state: "WAITING_HUMAN",
        },
        new Date("2026-08-10T15:06:00.000Z"),
      ),
    ).toMatchObject({
      humanAttendanceState: "WAITING_HUMAN",
      humanAttendanceStateVersion: 3,
      interventionId: "00000000-0000-4000-8000-000000000012",
    });
  });
});
