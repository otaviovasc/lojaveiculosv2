import { describe, expect, it } from "vitest";
import { createMemoryCrmConversationRepository } from "./crmConversationRepository.js";
import { createMemoryCrmSpecialDateRepository } from "./crmSpecialDateRepository.js";

const scope = {
  storeId: "store_test" as never,
  tenantId: "tenant_test" as never,
};

describe("memory special-date adapter", () => {
  it("keeps superseded pending work dormant and replaces it when eligible again", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const repository = createMemoryCrmSpecialDateRepository({
      conversationRepository,
      configs: [
        {
          connectionId: "connection_test",
          createdAt: new Date(),
          dateType: "birthday",
          enabled: true,
          id: "config_test",
          leadDays: 30,
          messageTemplate: "Mensagem inicial",
          sendTime: "09:00",
          updatedAt: new Date(),
          ...scope,
        },
      ],
    });
    const input = {
      configId: "config_test",
      configRevision: 0,
      connectionId: "connection_test",
      content: "Mensagem inicial",
      customerDisplayName: "Cliente",
      customerPhone: "5511999000001",
      dateType: "birthday" as const,
      recipientAddress: "5511999000001",
      recipientKey: "lead:first",
      scheduledAt: new Date("2026-09-07T12:00:00.000Z"),
      targetYear: 2026,
      ...scope,
    };

    const first = await repository.scheduleSpecialDateAtomic(input);
    expect(first.scheduled).toBe(true);

    const narrowed = await repository.upsertConfig({
      connectionId: input.connectionId,
      dateType: input.dateType,
      enabled: true,
      expectedRevision: 0,
      leadDays: 0,
      ...scope,
    });
    const dormant = await conversationRepository.findDueScheduledMessages({
      dueAt: new Date("2026-09-08T00:00:00.000Z"),
      limit: 10,
      specialDateConfigs: [{ id: narrowed.id, revision: narrowed.revision }],
      ...scope,
    });
    expect(dormant).toEqual([]);

    const widened = await repository.upsertConfig({
      connectionId: input.connectionId,
      dateType: input.dateType,
      enabled: true,
      expectedRevision: 1,
      leadDays: 30,
      ...scope,
    });
    const replacement = await repository.scheduleSpecialDateAtomic({
      ...input,
      configRevision: widened.revision,
      content: "Mensagem restaurada",
    });
    expect(replacement).toMatchObject({
      executionId: first.executionId,
      scheduled: true,
      scheduledMessageId: first.scheduledMessageId,
    });

    const due = await conversationRepository.findDueScheduledMessages({
      dueAt: new Date("2026-09-08T00:00:00.000Z"),
      limit: 10,
      specialDateConfigs: [{ id: widened.id, revision: widened.revision }],
      ...scope,
    });
    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({
      content: "Mensagem restaurada",
      id: first.scheduledMessageId,
    });
  });

  it("uses a fresh schedule ID for a retryable intent while preserving execution", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    let intentStatus:
      "indeterminate" | "provider_succeeded" | "retryable_failed" =
      "retryable_failed";
    const outboundIntentRepository = {
      findByIdempotencyKey: async () => ({
        claimToken: "claim-test",
        fingerprint: "old-fingerprint",
        id: "intent-test",
        messageId: null,
        providerResult: { code: "provider_unavailable", status: 502 },
        recoveryExpiresAt: null,
        startedAt: new Date(),
        status: intentStatus,
      }),
    };
    const repository = createMemoryCrmSpecialDateRepository({
      conversationRepository,
      outboundIntentRepository,
      configs: [
        {
          connectionId: "connection_test",
          createdAt: new Date(),
          dateType: "birthday",
          enabled: true,
          id: "config_test",
          leadDays: 30,
          messageTemplate: "Mensagem inicial",
          sendTime: "09:00",
          updatedAt: new Date(),
          ...scope,
        },
      ],
    });
    const input = {
      configId: "config_test",
      configRevision: 0,
      connectionId: "connection_test",
      content: "Mensagem inicial",
      customerDisplayName: "Cliente",
      customerPhone: "5511999000001",
      dateType: "birthday" as const,
      recipientAddress: "5511999000001",
      recipientKey: "lead:first",
      scheduledAt: new Date("2026-09-07T12:00:00.000Z"),
      targetYear: 2026,
      ...scope,
    };

    const first = await repository.scheduleSpecialDateAtomic(input);
    const revised = await repository.upsertConfig({
      connectionId: input.connectionId,
      dateType: input.dateType,
      enabled: true,
      expectedRevision: 0,
      leadDays: 0,
      ...scope,
    });
    const replacement = await repository.scheduleSpecialDateAtomic({
      ...input,
      configRevision: revised.revision,
      content: "Mensagem revisada",
    });

    expect(replacement).toMatchObject({
      executionId: first.executionId,
      scheduled: true,
    });
    expect(replacement.scheduledMessageId).not.toBe(first.scheduledMessageId);
    const messages = await conversationRepository.listScheduledMessages({
      limit: 10,
      ...scope,
    });
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: first.scheduledMessageId,
          status: "cancelled",
        }),
        expect.objectContaining({
          content: "Mensagem revisada",
          id: replacement.scheduledMessageId,
          status: "pending",
        }),
      ]),
    );

    for (const status of ["indeterminate", "provider_succeeded"] as const) {
      intentStatus = status;
      const config = await repository.upsertConfig({
        connectionId: input.connectionId,
        dateType: input.dateType,
        enabled: true,
        expectedRevision: revised.revision,
        ...scope,
      });
      revised.revision = config.revision;
      await expect(
        repository.scheduleSpecialDateAtomic({
          ...input,
          configRevision: config.revision,
          content: "Não substituir",
        }),
      ).resolves.toEqual({ scheduled: false });
    }
    const afterBlocked = await conversationRepository.listScheduledMessages({
      limit: 10,
      ...scope,
    });
    expect(afterBlocked).toHaveLength(2);
    expect(
      afterBlocked.find(
        (message) => message.id === replacement.scheduledMessageId,
      ),
    ).toMatchObject({ status: "pending", content: "Mensagem revisada" });
  });
});
