import { describe, expect, it } from "vitest";
import { createMemoryCrmConversationRepository } from "./crmConversationRepository.js";

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
});
