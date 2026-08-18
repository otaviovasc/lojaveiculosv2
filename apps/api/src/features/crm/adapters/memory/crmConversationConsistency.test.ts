import { describe, expect, it } from "vitest";
import { createMemoryCrmConversationRepository } from "./crmConversationRepository.js";
import {
  createInboundMessage as inbound,
  crmConversationConsistencyScope as scope,
} from "./crmConversationConsistency.testSupport.js";

describe("CRM conversation repository consistency", () => {
  it("does not reopen a completed cycle when an inbound message is replayed", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await repository.ingestMessage(inbound("message-replayed"));
    const completed = await repository.updateConversationCycle({
      expectedRevision: seeded.conversationCycle.revision,
      cycleId: seeded.conversationCycle.id,
      status: "COMPLETED",
      ...scope,
    });

    const duplicate = await repository.ingestMessage(
      inbound("message-replayed"),
    );

    expect(duplicate).toMatchObject({
      createdMessage: false,
      conversationCycle: {
        messageCount: 1,
        revision: completed?.revision,
        status: "COMPLETED",
      },
    });
  });

  it("keeps identical provider message ids scoped by tenant and store", async () => {
    const repository = createMemoryCrmConversationRepository();
    const first = await repository.ingestMessage(inbound("shared-message"));
    const second = await repository.ingestMessage({
      ...inbound("shared-message"),
      storeId: "store-2" as never,
      tenantId: "tenant-2" as never,
    });

    expect(second.createdConversationCycle).toBe(true);
    expect(second.conversationCycle.id).not.toBe(first.conversationCycle.id);
    expect(second.conversationCycle).toMatchObject({
      storeId: "store-2",
      tenantId: "tenant-2",
    });
  });

  it("does not assign a connection tag to a cycle from another connection", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await repository.ingestMessage(inbound("message-tag"));
    const tag = await repository.createTag({
      connectionId: "connection-2",
      name: "Connection two",
      ...scope,
    });

    const unchanged = await repository.addConversationCycleTag({
      cycleId: seeded.conversationCycle.id,
      tagId: tag.id,
      ...scope,
    });

    expect(unchanged).toMatchObject({
      revision: seeded.conversationCycle.revision,
      tags: [],
    });
  });

  it("reconciles a known CRM sender over an earlier provider echo", async () => {
    const repository = createMemoryCrmConversationRepository();
    const providerEcho = {
      ...inbound("echo-first", "Resposta"),
      direction: "OUTBOUND" as const,
      senderOrigin: "unknown" as const,
      senderType: "SYSTEM" as const,
      status: "SENT" as const,
    };
    await repository.ingestMessage(providerEcho);

    const correlated = await repository.ingestMessage({
      ...providerEcho,
      senderOrigin: "external_bot",
      senderType: "AI",
    });
    const replayedEcho = await repository.ingestMessage(providerEcho);

    expect(correlated).toMatchObject({
      createdMessage: false,
      message: { senderOrigin: "external_bot", senderType: "AI" },
    });
    expect(replayedEcho.message).toMatchObject({
      senderOrigin: "external_bot",
      senderType: "AI",
    });
  });

  it("persists sender origin and advances one revision per created message", async () => {
    const repository = createMemoryCrmConversationRepository();
    const first = await repository.ingestMessage(inbound("message-1"));
    const duplicate = await repository.ingestMessage(inbound("message-1"));
    const [, third] = await Promise.all([
      repository.ingestMessage(inbound("message-2", "Dois")),
      repository.ingestMessage(inbound("message-3", "Tres")),
    ]);

    expect(first.message.senderOrigin).toBe("customer");
    expect(first.conversationCycle.revision).toBe(1);
    expect(duplicate).toMatchObject({
      createdMessage: false,
      conversationCycle: { revision: 1 },
    });
    expect(third.conversationCycle.revision).toBe(3);
  });

  it("records one attendance revision for concurrent retries and rejects key reuse", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await repository.ingestMessage(inbound("message-1"));
    const interventionId = "00000000-0000-4000-8000-000000000501";
    const transition = {
      actorId: "user-1",
      actorKind: "user" as const,
      expectedHumanAttendanceStateVersion: null,
      expectedInterventionId: null,
      expectedRevision: seeded.conversationCycle.revision,
      expectedStatus: "ACTIVE" as const,
      humanAttendanceChangedAt: new Date("2026-08-10T15:01:00.000Z"),
      humanAttendanceState: "IN_HUMAN_SERVICE" as const,
      humanAttendanceStateVersion: 1,
      humanHandlingStartedAt: new Date("2026-08-10T15:01:00.000Z"),
      humanTakeoverAt: new Date("2026-08-10T15:01:00.000Z"),
      idempotencyKey: `attendance:${interventionId}:none:IN_HUMAN_SERVICE`,
      interventionId,
      interventionIdForLedger: interventionId,
      nextState: "IN_HUMAN_SERVICE" as const,
      occurredAt: new Date("2026-08-10T15:01:00.000Z"),
      previousState: null,
      reason: "human_outbound_message",
      requestFingerprint: "same-request-fingerprint",
      cycleId: seeded.conversationCycle.id,
      source: "admin",
      status: "HUMAN_TAKEOVER" as const,
      ...scope,
    };

    const results = await Promise.all([
      repository.transitionAttendance(transition),
      repository.transitionAttendance(transition),
    ]);

    expect(results.map((result) => result?.transitionCreated).sort()).toEqual([
      false,
      true,
    ]);
    expect(results[0]?.conversationCycle.revision).toBe(2);
    await expect(
      repository.transitionAttendance({
        ...transition,
        requestFingerprint: "different-request-fingerprint",
      }),
    ).rejects.toThrow("idempotency key was reused");
    const [cycle] = await repository.listConversationCycles({
      limit: 1,
      offset: 0,
      cycleId: seeded.conversationCycle.id,
      ...scope,
    });
    expect(cycle?.revision).toBe(2);
  });
});
