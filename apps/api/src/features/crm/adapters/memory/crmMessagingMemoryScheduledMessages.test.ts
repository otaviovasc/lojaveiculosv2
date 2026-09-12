import { describe, expect, it } from "vitest";
import type { CrmScheduledMessage } from "../../../../domains/crm/ports/crmConversationRepository.js";
import { createMemoryCrmConversationRepository } from "./crmConversationRepository.js";
import {
  createMemoryScheduledMessage,
  findDueMemoryScheduledMessages,
  updateMemoryScheduledMessage,
} from "./crmScheduledMessageMemory.js";

const scope = {
  storeId: "store_1" as never,
  tenantId: "tenant_1" as never,
};

describe("memory CRM messaging scheduled-message repository", () => {
  it("allows only one pending-state claimant during cancellation races", async () => {
    const repository = createMemoryCrmConversationRepository();
    const scheduled = await repository.createScheduledMessage({
      connectionId: "connection-1",
      recipientAddress: "5511999999302",
      scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
      cycleId: "cycle-1",
      content: "Mensagem",
      ...scope,
    });

    const [cancelled, claimed] = await Promise.all([
      repository.updateScheduledMessage({
        cancelledAt: new Date("2030-01-01T10:00:00.000Z"),
        expectedStatus: "pending",
        id: scheduled.id,
        status: "cancelled",
        ...scope,
      }),
      repository.updateScheduledMessage({
        expectedStatus: "pending",
        id: scheduled.id,
        status: "sending",
        ...scope,
      }),
    ]);

    expect([cancelled, claimed].filter(Boolean)).toHaveLength(1);
    expect(cancelled?.status).toBe("cancelled");
    expect(claimed).toBeNull();
  });

  it("does not return a claimed message as due again", async () => {
    const repository = createMemoryCrmConversationRepository();
    const scheduled = await repository.createScheduledMessage({
      connectionId: "connection-1",
      recipientAddress: "5511999999303",
      scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
      cycleId: "cycle-1",
      content: "Mensagem",
      ...scope,
    });
    const query = {
      dueAt: new Date("2030-01-01T10:01:00.000Z"),
      limit: 10,
      ...scope,
    };

    expect(await repository.findDueScheduledMessages(query)).toHaveLength(1);
    await repository.updateScheduledMessage({
      expectedStatus: "pending",
      id: scheduled.id,
      status: "sending",
      ...scope,
    });

    expect(await repository.findDueScheduledMessages(query)).toEqual([]);
  });

  it("returns immutable due snapshots and fences an expired owner", async () => {
    const repository = createMemoryCrmConversationRepository();
    const scheduled = await repository.createScheduledMessage({
      connectionId: "connection-1",
      recipientAddress: "5511999999304",
      scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
      cycleId: "cycle-1",
      content: "Mensagem",
      ...scope,
    });
    const now = new Date("2026-09-07T15:00:00.000Z");
    const staleBefore = new Date(now.getTime() - 120_000);
    const first = await repository.updateScheduledMessage({
      expectedStatus: "pending",
      id: scheduled.id,
      status: "sending",
      updatedAt: new Date("2026-09-07T14:55:00.000Z"),
      ...scope,
    });
    if (!first) throw new Error("Expected the first scheduler claim.");

    const due = await repository.findDueScheduledMessages({
      dueAt: new Date("2030-01-01T10:01:00.000Z"),
      limit: 10,
      now,
      staleBefore,
      ...scope,
    });
    expect(due).toHaveLength(1);
    const snapshot = due[0];
    if (!snapshot) throw new Error("Expected an immutable due snapshot.");
    snapshot.content = "mutated only in the snapshot";

    const second = await repository.updateScheduledMessage({
      expectedStatuses: ["sending"],
      expectedUpdatedAt: first.updatedAt,
      id: scheduled.id,
      now,
      staleBefore,
      status: "sending",
      updatedAt: now,
      ...scope,
    });
    if (!second) throw new Error("Expected the recovery claim.");

    const staleCompletion = await repository.updateScheduledMessage({
      expectedUpdatedAt: first.updatedAt,
      id: scheduled.id,
      sentMessageId: "old-owner-message",
      status: "sent",
      ...scope,
    });
    expect(staleCompletion).toBeNull();
    const current = await repository.updateScheduledMessage({
      expectedUpdatedAt: second.updatedAt,
      id: scheduled.id,
      sentMessageId: "new-owner-message",
      status: "sent",
      ...scope,
    });
    expect(current?.sentMessageId).toBe("new-owner-message");

    const [persisted] = await repository.listScheduledMessages({
      limit: 1,
      scheduledMessageId: scheduled.id,
      ...scope,
    });
    expect(persisted?.content).toBe("Mensagem");
  });

  it("does not use a future due cutoff as the lease clock", async () => {
    const repository = createMemoryCrmConversationRepository();
    const scheduled = await repository.createScheduledMessage({
      connectionId: "connection-1",
      recipientAddress: "5511999999305",
      scheduledAt: new Date("2030-01-01T10:00:00.000Z"),
      cycleId: "cycle-1",
      content: "Mensagem futura",
      ...scope,
    });
    const now = new Date("2026-09-07T15:00:00.000Z");
    await repository.updateScheduledMessage({
      expectedStatus: "pending",
      id: scheduled.id,
      status: "sending",
      updatedAt: now,
      ...scope,
    });

    await expect(
      repository.findDueScheduledMessages({
        dueAt: new Date("2030-01-01T10:01:00.000Z"),
        limit: 10,
        now,
        staleBefore: new Date(now.getTime() - 120_000),
        ...scope,
      }),
    ).resolves.toEqual([]);
  });

  it("filters stale special-date revisions before applying the due limit", () => {
    const messages: CrmScheduledMessage[] = [];
    const dueAt = new Date("2026-09-07T16:00:00.000Z");
    const stale = createMemoryScheduledMessage(messages, {
      connectionId: "connection-1",
      content: "Old annual message",
      metadata: {
        specialDate: { configId: "config-1", configRevision: 1 },
      },
      recipientAddress: "5511999999306",
      scheduledAt: new Date("2026-09-07T15:00:00.000Z"),
      cycleId: "cycle-1",
      ...scope,
    });
    const healthy = createMemoryScheduledMessage(messages, {
      connectionId: "connection-1",
      content: "Current message",
      recipientAddress: "5511999999307",
      scheduledAt: new Date("2026-09-07T15:01:00.000Z"),
      cycleId: "cycle-1",
      ...scope,
    });

    expect(
      findDueMemoryScheduledMessages(messages, [], {
        dueAt,
        limit: 1,
        now: dueAt,
        specialDateConfigs: [{ id: "config-1", revision: 2 }],
        staleBefore: new Date("2026-09-07T14:58:00.000Z"),
        ...scope,
      }).map((message) => message.id),
    ).toEqual([healthy.id]);
    expect(stale.status).toBe("pending");
  });

  it("keeps stale sending special-date rows discoverable for receipt replay", () => {
    const messages: CrmScheduledMessage[] = [];
    const scheduled = createMemoryScheduledMessage(messages, {
      connectionId: "connection-1",
      content: "Already accepted",
      metadata: {
        specialDate: { configId: "config-1", configRevision: 1 },
      },
      recipientAddress: "5511999999308",
      scheduledAt: new Date("2026-09-07T15:00:00.000Z"),
      cycleId: "cycle-1",
      ...scope,
    });
    updateMemoryScheduledMessage(messages, {
      expectedStatus: "pending",
      id: scheduled.id,
      status: "sending",
      updatedAt: new Date("2026-09-07T14:00:00.000Z"),
      ...scope,
    });

    expect(
      findDueMemoryScheduledMessages(messages, [], {
        dueAt: new Date("2026-09-07T16:00:00.000Z"),
        limit: 1,
        now: new Date("2026-09-07T16:00:00.000Z"),
        specialDateConfigs: [],
        staleBefore: new Date("2026-09-07T14:58:00.000Z"),
        ...scope,
      }).map((message) => message.id),
    ).toEqual([scheduled.id]);
  });
});
