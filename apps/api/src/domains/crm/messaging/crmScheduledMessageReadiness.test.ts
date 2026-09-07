import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type {
  CrmConversationRepository,
  CrmScheduledMessage,
  UpdateCrmScheduledMessageInput,
} from "../ports/crmConversationRepository.js";
import type {
  CrmOutboundIntentRepository,
  OutboundIntent,
} from "../ports/crmOutboundIntentRepository.js";
import type { CrmServicePorts } from "../services/CrmService/types.js";
import { createMemoryCrmSpecialDateRepository } from "../testSupportSpecialDates.js";
import { findScheduledMessageReadiness } from "./crmScheduledMessageReadiness.js";
import { processDueMessages } from "./crmScheduledMessageProcessorLoop.js";
import { readOutboundReceiptState } from "./crmScheduledMessageProcessorRecovery.js";

const scope = {
  storeId: "store_1" as never,
  tenantId: "tenant_1" as never,
};

describe("CRM scheduled-message readiness and receipt recovery", () => {
  it("blocks a disabled or revised special-date configuration", async () => {
    const scheduled = scheduledMessage({
      specialDate: {
        configId: "config-1",
        configRevision: 4,
      },
    });
    const specialDates = createMemoryCrmSpecialDateRepository({
      configs: [
        {
          connectionId: scheduled.connectionId,
          createdAt: new Date(),
          dateType: "birthday",
          enabled: false,
          id: "config-1",
          leadDays: 0,
          messageTemplate: "Hello",
          revision: 4,
          sendTime: "09:00",
          storeId: scheduled.storeId,
          tenantId: scheduled.tenantId,
          updatedAt: new Date(),
        },
      ],
    });
    const ports = {
      crmSpecialDateRepository: specialDates,
    } as CrmServicePorts;

    await expect(
      findScheduledMessageReadiness(scheduled, ports),
    ).resolves.toMatchObject({
      blocked: true,
      blockedBy: "specialDate",
    });

    const revised = createMemoryCrmSpecialDateRepository({
      configs: [
        {
          connectionId: scheduled.connectionId,
          createdAt: new Date(),
          dateType: "birthday",
          enabled: true,
          id: "config-1",
          leadDays: 0,
          messageTemplate: "Hello",
          revision: 5,
          sendTime: "09:00",
          storeId: scheduled.storeId,
          tenantId: scheduled.tenantId,
          updatedAt: new Date(),
        },
      ],
    });
    await expect(
      findScheduledMessageReadiness(scheduled, {
        crmSpecialDateRepository: revised,
      } as CrmServicePorts),
    ).resolves.toMatchObject({
      blocked: true,
      blockedBy: "specialDate",
      pendingDisposition: "defer",
    });
  });

  it("treats malformed provider confirmation as unknown evidence", async () => {
    const intent: OutboundIntent = {
      claimToken: "claim-1",
      fingerprint: "fingerprint-1",
      id: "intent-1",
      messageId: null,
      providerResult: {
        externalId: "provider-1",
        providerTimestamp: "not-a-timestamp",
      },
      recoveryExpiresAt: null,
      startedAt: new Date(),
      status: "provider_succeeded",
    };
    const intents = {
      findByIdempotencyKey: async () => intent,
    } as unknown as CrmOutboundIntentRepository;

    await expect(
      readOutboundReceiptState(scheduledMessage(), scope, {
        crmOutboundIntentRepository: intents,
      } as CrmServicePorts),
    ).resolves.toBe("unknown");
  });

  it("keeps retryable provider failures eligible for a later attempt", async () => {
    const intent: OutboundIntent = {
      claimToken: "claim-retryable",
      fingerprint: "fingerprint-retryable",
      id: "intent-retryable",
      messageId: null,
      providerResult: { code: "rate_limited" },
      recoveryExpiresAt: null,
      startedAt: new Date(),
      status: "retryable_failed",
    };
    const intents = {
      findByIdempotencyKey: async () => intent,
    } as unknown as CrmOutboundIntentRepository;

    await expect(
      readOutboundReceiptState(scheduledMessage(), scope, {
        crmOutboundIntentRepository: intents,
      } as CrmServicePorts),
    ).resolves.toBe("retryable");
  });

  it("requeues revised special-date work in the processor before evaluation", async () => {
    const scheduled = scheduledMessage({
      scheduledClaimToken: "scheduler-owner",
      scheduledDeliveryAttempts: 3,
      scheduledDeliveryNextAttemptAt: "2026-09-07T15:05:00.000Z",
      specialDate: { configId: "config-1", configRevision: 4 },
    });
    const updates: UpdateCrmScheduledMessageInput[] = [];
    const repository = {
      findDueScheduledMessages: async () => [scheduled],
      listScheduledMessages: async () => [],
      updateScheduledMessage: async (input: UpdateCrmScheduledMessageInput) => {
        updates.push(input);
        return {
          ...scheduled,
          metadata: input.metadata ?? scheduled.metadata,
          status: input.status,
          updatedAt: new Date("2026-09-07T15:01:00.000Z"),
        };
      },
    } as unknown as CrmConversationRepository;
    const intents = {
      findByIdempotencyKey: async () => ({
        claimToken: "outbound-owner",
        fingerprint: "old-payload",
        id: "intent-1",
        messageId: null,
        providerResult: { code: "rate_limited" },
        recoveryExpiresAt: null,
        startedAt: new Date("2026-09-07T14:55:00.000Z"),
        status: "retryable_failed" as const,
      }),
    } as unknown as CrmOutboundIntentRepository;
    const specialDates = createMemoryCrmSpecialDateRepository({
      configs: [
        {
          connectionId: scheduled.connectionId,
          createdAt: new Date(),
          dateType: "birthday",
          enabled: true,
          id: "config-1",
          leadDays: 0,
          messageTemplate: "Hello",
          revision: 5,
          sendTime: "09:00",
          storeId: scheduled.storeId,
          tenantId: scheduled.tenantId,
          updatedAt: new Date(),
        },
      ],
    });
    const context = createServiceContext({
      actor: { id: "scheduler", kind: "system" },
      entitlements: ["crm"],
      permissions: ["crm.messages.send", "crm.scheduled_messages.process"],
      request: { requestId: "scheduled-revision-test" },
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    });

    const result = await processDueMessages(
      context,
      { dueAt: new Date("2026-09-07T16:00:00.000Z"), limit: 1, scope },
      {
        crmConversationRepository: repository,
        crmOutboundIntentRepository: intents,
        crmSpecialDateRepository: specialDates,
      } as CrmServicePorts,
    );

    expect(result).toMatchObject({ processed: 0, sent: 0 });
    expect(updates[0]).toMatchObject({
      expectedClaimToken: "scheduler-owner",
      expectedStatus: "sending",
      status: "pending",
    });
    expect(updates[0]?.metadata).not.toHaveProperty("scheduledClaimToken");
    expect(updates[0]?.metadata).not.toHaveProperty(
      "scheduledDeliveryNextAttemptAt",
    );
  });
});

function scheduledMessage(metadata: Record<string, unknown> = {}) {
  const now = new Date("2026-09-07T15:00:00.000Z");
  return {
    cancelledAt: null,
    campaignId: null,
    campaignMessageType: null,
    campaignRecipientKey: null,
    campaignSequence: null,
    connectionId: "connection-1",
    content: "Hello",
    createdAt: now,
    createdByUserId: null,
    cycleId: "cycle-1",
    errorMessage: null,
    id: "scheduled-1",
    metadata,
    recipientAddress: "5511999999999",
    scheduledAt: now,
    sentAt: null,
    sentMessageId: null,
    status: "sending",
    updatedAt: now,
    ...scope,
  } satisfies CrmScheduledMessage;
}
