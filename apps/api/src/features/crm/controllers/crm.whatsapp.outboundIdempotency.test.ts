import { describe, expect, it, vi } from "vitest";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { sendWhatsappText } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappText.js";
import { executeDurableOutboundProviderCall } from "../../../domains/crm/whatsapp/executeDurableOutboundProviderCall.js";
import { CrmWhatsappGatewayError } from "../../../domains/crm/ports/crmWhatsappGateway.js";
import { createMemoryCrmBotIntegrationRepository } from "../adapters/memory/crmBotIntegrationRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappOutboundIntentRepository } from "../adapters/memory/crmWhatsappOutboundIntentRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  connection,
  context,
  storeId,
  tenantId,
} from "./crm.whatsapp.outboundIdempotency.testSupport.js";

describe("CRM WhatsApp outbound idempotency", () => {
  it("reuses a durable provider receipt after local message persistence fails", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const seeded = await repository.ingestMessage({
      buyerPhone: "5511999999999",
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
      crmBotIntegrationRepository: createMemoryCrmBotIntegrationRepository(),
      crmConnectionRepository: createTestCrmConnectionRepository([
        connection(),
      ]),
      crmRepository: createMemoryCrmRepository(),
      crmWhatsappGateway: { sendText } as never,
      crmWhatsappOutboundIntentRepository:
        createMemoryCrmWhatsappOutboundIntentRepository(),
      crmWhatsappRepository: {
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
      senderOrigin: "bot_api" as const,
      senderType: "AI" as const,
      sessionId: seeded.session.id,
      text: "hello",
    };

    await expect(sendWhatsappText(context(), input, ports)).rejects.toThrow(
      "local write unavailable",
    );
    const recovered = await sendWhatsappText(context(), input, ports);

    expect(recovered.externalId).toBe("provider_1");
    expect(sendText).toHaveBeenCalledTimes(1);
  });

  it("rejects idempotency-key reuse with a different sender origin", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const seeded = await repository.ingestMessage({
      buyerPhone: "5511999999999",
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
    const intents = createMemoryCrmWhatsappOutboundIntentRepository();
    const ports = {
      crmAssigneeMembershipRepository: {
        isActiveStoreMember: async () => true,
      },
      crmBotIntegrationRepository: createMemoryCrmBotIntegrationRepository(),
      crmConnectionRepository: createTestCrmConnectionRepository([
        connection(),
      ]),
      crmRepository: createMemoryCrmRepository(),
      crmWhatsappGateway: {
        sendText: vi.fn(async () => ({
          externalId: "provider-origin-fingerprint",
          providerTimestamp: new Date("2026-08-10T12:00:00.000Z"),
        })),
      } as never,
      crmWhatsappOutboundIntentRepository: intents,
      crmWhatsappRepository: repository,
    };
    const shared = {
      idempotencyKey: "sender-origin-key",
      sessionId: seeded.session.id,
      text: "Mesmo texto",
    };

    await sendWhatsappText(
      context(),
      { ...shared, senderOrigin: "bot_api", senderType: "AI" },
      ports,
    );

    await expect(
      sendWhatsappText(
        context(),
        { ...shared, senderOrigin: "human_crm", senderType: "HUMAN" },
        ports,
      ),
    ).rejects.toThrow("idempotency key was reused");
  });

  it.each(["conversation-start", "bot-media"])(
    "recovers the %s provider receipt without a duplicate effect",
    async (kind) => {
      const intents = createMemoryCrmWhatsappOutboundIntentRepository();
      const send = vi.fn(async () => ({
        externalId: `${kind}-provider-id`,
        providerTimestamp: new Date("2026-08-10T12:00:00Z"),
      }));
      const ports = {
        crmRepository: createMemoryCrmRepository(),
        crmWhatsappOutboundIntentRepository: intents,
      };
      const request = {
        connectionId: "connection_1",
        idempotencyKey: `${kind}-key`,
        payload: { kind },
        senderOrigin:
          kind === "bot-media" ? ("bot_api" as const) : ("human_crm" as const),
        senderType: kind === "bot-media" ? ("AI" as const) : ("HUMAN" as const),
        send,
        sessionId: kind === "bot-media" ? null : "session_1",
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
      const intents = createMemoryCrmWhatsappOutboundIntentRepository();
      const send = vi
        .fn<() => Promise<{ externalId: string; providerTimestamp: Date }>>()
        .mockRejectedValueOnce(
          new CrmWhatsappGatewayError(
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
        sessionId: "session_1",
      };

      await expect(
        executeDurableOutboundProviderCall(context(), request, {
          crmRepository: createMemoryCrmRepository(),
          crmWhatsappOutboundIntentRepository: intents,
        }),
      ).rejects.toMatchObject({ code });

      const repeated = executeDurableOutboundProviderCall(context(), request, {
        crmRepository: createMemoryCrmRepository(),
        crmWhatsappOutboundIntentRepository: intents,
      });
      if (code === "rate_limited") await expect(repeated).resolves.toBeTruthy();
      else await expect(repeated).rejects.toThrow();
      expect(send).toHaveBeenCalledTimes(expectedCalls);
    },
  );
});
