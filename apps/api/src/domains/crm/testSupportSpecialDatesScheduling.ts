import type {
  MemoryCrmSpecialDateRepositoryOptions,
  ScheduleSpecialDateAtomicInput,
  ScheduleSpecialDateAtomicResult,
} from "./ports/crmSpecialDateRepository.js";
import {
  canonicalRecipientKey,
  findSpecialDateExecution,
  newSpecialDateExecution,
  specialDateMetadata,
  type MemorySpecialDateState,
} from "./testSupportSpecialDatesState.js";

export async function scheduleSpecialDateInMemory(
  state: MemorySpecialDateState,
  conversationRepository: MemoryCrmSpecialDateRepositoryOptions["conversationRepository"],
  outboundIntentRepository: MemoryCrmSpecialDateRepositoryOptions["outboundIntentRepository"],
  input: ScheduleSpecialDateAtomicInput,
): Promise<ScheduleSpecialDateAtomicResult> {
  const recipientKey = canonicalRecipientKey(
    input.recipientKey,
    input.customerPhone,
  );
  const existing = findSpecialDateExecution(state, {
    ...input,
    recipientKey,
  });
  if (existing) {
    if (
      existing.status !== "scheduled" ||
      existing.configRevision === input.configRevision
    ) {
      return { scheduled: false };
    }
    if (conversationRepository && existing.scheduledMessageId) {
      const replacement = await replaceRetryableScheduledMessage(
        conversationRepository,
        outboundIntentRepository,
        existing.scheduledMessageId,
        existing.id,
        input,
        recipientKey,
      );
      if (replacement.kind === "replaced") {
        existing.scheduledMessageId = replacement.id;
        existing.configRevision = input.configRevision;
        existing.updatedAt = new Date();
        return {
          executionId: existing.id,
          scheduled: true,
          scheduledMessageId: replacement.id,
        };
      }
      if (replacement.kind === "blocked") return { scheduled: false };
      const updatedMessage =
        await conversationRepository.updateScheduledMessage({
          content: input.content,
          expectedStatus: "pending",
          id: existing.scheduledMessageId,
          metadata: specialDateMetadata(input, existing.id, recipientKey),
          scheduledAt: input.scheduledAt,
          status: "pending",
          storeId: input.storeId,
          tenantId: input.tenantId,
        });
      if (!updatedMessage) return { scheduled: false };
    }
    existing.configRevision = input.configRevision;
    existing.updatedAt = new Date();
    return {
      executionId: existing.id,
      scheduled: true,
      ...(existing.scheduledMessageId
        ? { scheduledMessageId: existing.scheduledMessageId }
        : {}),
    };
  }

  const execution = newSpecialDateExecution({
    connectionId: input.connectionId,
    dateType: input.dateType,
    recipientKey,
    storeId: input.storeId,
    targetYear: input.targetYear,
    tenantId: input.tenantId,
    configRevision: input.configRevision,
  });
  state.executions.push(execution);
  try {
    if (conversationRepository) {
      const cycle = await conversationRepository.upsertConversationCycleContext(
        {
          channel: input.channel ?? "WHATSAPP",
          connectionId: input.connectionId,
          customerPhone: input.customerPhone,
          storeId: input.storeId,
          tenantId: input.tenantId,
          ...(input.customerDisplayName === undefined
            ? {}
            : { customerDisplayName: input.customerDisplayName }),
        },
      );
      const message = await conversationRepository.createScheduledMessage({
        connectionId: input.connectionId,
        content: input.content,
        cycleId: cycle.id,
        metadata: specialDateMetadata(input, execution.id, recipientKey),
        recipientAddress: input.recipientAddress,
        scheduledAt: input.scheduledAt,
        storeId: input.storeId,
        tenantId: input.tenantId,
      });
      execution.scheduledMessageId = message.id;
    }
  } catch (error) {
    state.executions.splice(state.executions.indexOf(execution), 1);
    throw error;
  }
  return {
    executionId: execution.id,
    scheduled: true,
    ...(execution.scheduledMessageId
      ? { scheduledMessageId: execution.scheduledMessageId }
      : {}),
  };
}

async function replaceRetryableScheduledMessage(
  conversationRepository: NonNullable<
    MemoryCrmSpecialDateRepositoryOptions["conversationRepository"]
  >,
  outboundIntentRepository: MemoryCrmSpecialDateRepositoryOptions["outboundIntentRepository"],
  scheduledMessageId: string,
  executionId: string,
  input: ScheduleSpecialDateAtomicInput,
  recipientKey: string,
) {
  const [scheduled] = await conversationRepository.listScheduledMessages({
    limit: 1,
    scheduledMessageId,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  if (!scheduled || scheduled.status !== "pending")
    return { kind: "blocked" } as const;

  const intent = outboundIntentRepository
    ? await outboundIntentRepository.findByIdempotencyKey({
        idempotencyKey: `scheduled:${scheduled.id}`,
        storeId: input.storeId,
        tenantId: input.tenantId,
      })
    : null;
  if (!intent) return { kind: "in_place" } as const;
  if (intent.status !== "retryable_failed") return { kind: "blocked" } as const;

  const cancelled = await conversationRepository.updateScheduledMessage({
    cancelledAt: new Date(),
    errorMessage: "Superseded by a retryable special-date revision.",
    expectedStatus: scheduled.status,
    id: scheduled.id,
    status: "cancelled",
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  if (!cancelled) return { kind: "blocked" } as const;
  try {
    const replacement = await conversationRepository.createScheduledMessage({
      campaignId: scheduled.campaignId,
      campaignMessageType: scheduled.campaignMessageType,
      campaignRecipientKey: scheduled.campaignRecipientKey,
      campaignSequence: scheduled.campaignSequence,
      connectionId: input.connectionId,
      content: input.content,
      createdByUserId: scheduled.createdByUserId,
      cycleId: scheduled.cycleId,
      metadata: specialDateMetadata(input, executionId, recipientKey),
      recipientAddress: input.recipientAddress,
      scheduledAt: input.scheduledAt,
      storeId: input.storeId,
      tenantId: input.tenantId,
    });
    return { kind: "replaced", id: replacement.id } as const;
  } catch (error) {
    await conversationRepository.updateScheduledMessage({
      cancelledAt: null,
      errorMessage: null,
      expectedStatus: "cancelled",
      id: scheduled.id,
      status: "pending",
      storeId: input.storeId,
      tenantId: input.tenantId,
    });
    throw error;
  }
}
