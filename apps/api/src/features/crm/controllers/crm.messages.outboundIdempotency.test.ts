import { describe, expect, it, vi } from "vitest";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { createTestCrmRoutingPorts } from "../../../domains/crm/testSupportConnections.js";
import { sendMessage } from "../../../domains/crm/services/CrmMessagingService/sendMessage.js";
import { executeDurableOutboundProviderCall } from "../../../domains/crm/messaging/executeDurableOutboundProviderCall.js";
import { CrmMessagingGatewayError } from "../../../domains/crm/ports/crmMessagingGateway.js";
import { createMemoryCrmExternalBotIntegrationRepository } from "../adapters/memory/crmExternalBotIntegrationRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmOutboundIntentRepository } from "../adapters/memory/crmOutboundIntentRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  connection,
  context,
  storeId,
  tenantId,
} from "./crm.messages.outboundIdempotency.testSupport.js";

describe("CRM outbound idempotency", () => {
  it("reuses a durable provider receipt after local message persistence fails", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await repository.ingestMessage({
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId: "connection_1",
      content: "inbound",
      direction: "INBOUND",
      externalId: "incoming_1",
      metadata: {},
      providerTimestamp: new Date(),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    let rejectOutboundOnce = true;
    const sendText = vi.fn(async () => ({
      externalId: "provider_1",
      providerTimestamp: new Date("2026-08-10T12:00:00.000Z"),
    }));
    const ports = {
      crmAssigneeMembershipRepository: {
        isActiveStoreMember: async () => true,
      },
      crmExternalBotIntegrationRepository:
        createMemoryCrmExternalBotIntegrationRepository(),
      crmConnectionRepository: createTestCrmConnectionRepository([
        connection(),
      ]),
      ...createTestCrmRoutingPorts([connection()]),
      crmRepository: createMemoryCrmRepository(),
      crmMessagingGateway: { sendText } as never,
      crmOutboundIntentRepository: createMemoryCrmOutboundIntentRepository(),
      crmConversationRepository: {
        ...repository,
        ingestMessage: async (
          input: Parameters<typeof repository.ingestMessage>[0],
        ) => {
          if (input.direction === "OUTBOUND" && rejectOutboundOnce) {
            rejectOutboundOnce = false;
            throw new Error("local write unavailable");
          }
          return repository.ingestMessage(input);
        },
      },
    };
    const input = {
      idempotencyKey: "customer-action-1",
      senderOrigin: "external_bot" as const,
      senderType: "AI" as const,
      cycleId: seeded.conversationCycle.id,
      text: "hello",
    };

    await expect(sendMessage(context(), input, ports)).rejects.toThrow(
      "local write unavailable",
    );
    const recovered = await sendMessage(context(), input, ports);

    expect(recovered.externalId).toBe("provider_1");
    expect(recovered.metadata).toMatchObject({
      crmMessaging: { clientRequestId: "customer-action-1" },
    });
    expect(sendText).toHaveBeenCalledTimes(1);
  });

  it("rejects idempotency-key reuse with a different sender origin", async () => {
    const repository = createMemoryCrmConversationRepository();
    const seeded = await repository.ingestMessage({
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId: "connection_1",
      content: "inbound",
      direction: "INBOUND",
      externalId: "incoming-origin-fingerprint",
      metadata: {},
      providerTimestamp: new Date(),
      senderOrigin: "customer",
      senderType: "CUSTOMER",
      status: "DELIVERED",
      storeId,
      tenantId,
      type: "TEXT",
    });
    const intents = createMemoryCrmOutboundIntentRepository();
    const ports = {
      crmAssigneeMembershipRepository: {
        isActiveStoreMember: async () => true,
      },
      crmExternalBotIntegrationRepository:
        createMemoryCrmExternalBotIntegrationRepository(),
      crmConnectionRepository: createTestCrmConnectionRepository([
        connection(),
      ]),
      ...createTestCrmRoutingPorts([connection()]),
      crmRepository: createMemoryCrmRepository(),
      crmMessagingGateway: {
        sendText: vi.fn(async () => ({
          externalId: "provider-origin-fingerprint",
          providerTimestamp: new Date("2026-08-10T12:00:00.000Z"),
        })),
      } as never,
      crmOutboundIntentRepository: intents,
      crmConversationRepository: repository,
    };
    const shared = {
      idempotencyKey: "sender-origin-key",
      cycleId: seeded.conversationCycle.id,
      text: "Mesmo texto",
    };

    await sendMessage(
      context(),
      { ...shared, senderOrigin: "external_bot", senderType: "AI" },
      ports,
    );

    await expect(
      sendMessage(
        context(),
        { ...shared, senderOrigin: "human_crm", senderType: "HUMAN" },
        ports,
      ),
    ).rejects.toThrow("idempotency key was reused");
  });

  it.each(["conversation-start", "bot-media"])(
    "recovers the %s provider receipt without a duplicate effect",
    async (kind) => {
      const intents = createMemoryCrmOutboundIntentRepository();
      const send = vi.fn(async () => ({
        externalId: `${kind}-provider-id`,
        providerTimestamp: new Date("2026-08-10T12:00:00Z"),
      }));
      const ports = {
        crmRepository: createMemoryCrmRepository(),
        crmOutboundIntentRepository: intents,
      };
      const request = {
        connectionId: "connection_1",
        idempotencyKey: `${kind}-key`,
        payload: { kind },
        senderOrigin:
          kind === "bot-media"
            ? ("external_bot" as const)
            : ("human_crm" as const),
        senderType: kind === "bot-media" ? ("AI" as const) : ("HUMAN" as const),
        send,
        cycleId: kind === "bot-media" ? null : "cycle_1",
      };
      const first = await executeDurableOutboundProviderCall(
        context(),
        request,
        ports,
      );
      const recovered = await executeDurableOutboundProviderCall(
        context(),
        request,
        ports,
      );
      expect(recovered.sent).toEqual(first.sent);
      expect(send).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ["provider_rejected", "failed", 1],
    ["rate_limited", "retryable_failed", 2],
    ["timeout", "indeterminate", 1],
  ] as const)(
    "persists %s provider outcomes as %s",
    async (code, _expectedState, expectedCalls) => {
      const intents = createMemoryCrmOutboundIntentRepository();
      const send = vi
        .fn<() => Promise<{ externalId: string; providerTimestamp: Date }>>()
        .mockRejectedValueOnce(
          new CrmMessagingGatewayError(
            `provider ${code}`,
            code === "rate_limited" ? 429 : 502,
            undefined,
            code,
          ),
        )
        .mockResolvedValue({
          externalId: "provider-retry-id",
          providerTimestamp: new Date("2026-08-10T12:00:00Z"),
        });
      const request = {
        connectionId: "connection_1",
        idempotencyKey: `classification-${code}`,
        payload: { code },
        senderOrigin: "human_crm" as const,
        senderType: "HUMAN" as const,
        send,
        cycleId: "cycle_1",
      };

      await expect(
        executeDurableOutboundProviderCall(context(), request, {
          crmRepository: createMemoryCrmRepository(),
          crmOutboundIntentRepository: intents,
        }),
      ).rejects.toMatchObject({ code });

      const repeated = executeDurableOutboundProviderCall(context(), request, {
        crmRepository: createMemoryCrmRepository(),
        crmOutboundIntentRepository: intents,
      });
      if (code === "rate_limited") await expect(repeated).resolves.toBeTruthy();
      else await expect(repeated).rejects.toThrow();
      expect(send).toHaveBeenCalledTimes(expectedCalls);
    },
  );
});
