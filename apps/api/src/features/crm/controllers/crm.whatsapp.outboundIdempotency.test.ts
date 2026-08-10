import { describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmBotIntegrationRepository } from "../adapters/memory/crmBotIntegrationRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createMemoryCrmWhatsappOutboundIntentRepository } from "../adapters/memory/crmWhatsappOutboundIntentRepository.js";
import { sendWhatsappText } from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappText.js";
import { executeDurableOutboundProviderCall } from "../../../domains/crm/whatsapp/executeDurableOutboundProviderCall.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

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

  it("never reclaims a stale ambiguous provider attempt", async () => {
    const intents = createMemoryCrmWhatsappOutboundIntentRepository();
    const first = await intents.claim(
      claimInput(new Date("2026-08-10T10:00:00Z")),
    );
    const stale = await intents.claim(
      claimInput(new Date("2026-08-10T10:03:00Z")),
    );
    expect(first.kind).toBe("claimed");
    expect(stale.kind).toBe("indeterminate");
  });

  it("grants only one provider claim to concurrent callers", async () => {
    const intents = createMemoryCrmWhatsappOutboundIntentRepository();
    const now = new Date("2026-08-10T10:00:00Z");
    const results = await Promise.all([
      intents.claim(claimInput(now)),
      intents.claim(claimInput(now)),
    ]);
    expect(results.map((result) => result.kind).sort()).toEqual([
      "claimed",
      "in_progress",
    ]);
  });

  it("minimizes the recovery payload after local completion", async () => {
    const intents = createMemoryCrmWhatsappOutboundIntentRepository();
    const now = new Date("2026-08-10T10:00:00Z");
    const claimed = await intents.claim(claimInput(now));
    if (claimed.kind !== "claimed") throw new Error("expected claim");
    await intents.recordProviderSuccess({
      claimToken: claimed.intent.claimToken,
      id: claimed.intent.id,
      providerResult: {
        externalId: "provider_1",
        providerTimestamp: now.toISOString(),
      },
    });
    await intents.complete({
      claimToken: claimed.intent.claimToken,
      id: claimed.intent.id,
      messageId: "message_1",
      sessionId: "session_1",
    });
    const completed = await intents.claim(claimInput(now));
    expect(completed.kind).toBe("completed");
    if (completed.kind === "completed") {
      expect(completed.intent.providerResult).toEqual({
        externalId: "provider_1",
        providerTimestamp: now.toISOString(),
      });
      expect(Object.keys(completed.intent.providerResult ?? {})).toHaveLength(
        2,
      );
    }
  });

  it("expires abandoned recovery payloads after bounded retention", async () => {
    const intents = createMemoryCrmWhatsappOutboundIntentRepository();
    const claimed = await intents.claim(claimInput(new Date()));
    if (claimed.kind !== "claimed") throw new Error("expected claim");
    await intents.recordProviderSuccess({
      claimToken: claimed.intent.claimToken,
      id: claimed.intent.id,
      providerResult: {
        externalId: "provider_1",
        providerTimestamp: new Date().toISOString(),
      },
    });
    expect(
      await intents.purgeExpiredRecoveryPayloads({
        limit: 10,
        now: new Date(Date.now() + 8 * 24 * 60 * 60_000),
      }),
    ).toBe(1);
    const expired = await intents.claim(claimInput(new Date()));
    expect(expired.kind).toBe("indeterminate");
    if (expired.kind === "indeterminate") {
      expect(expired.intent.providerResult).toBeNull();
    }
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
});

function context() {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      permissions: ["crm.whatsapp.send"],
      request: { requestId: "request_1" },
      storeId,
      tenantId,
    }),
    { entitlements: ["crm"] as const },
  );
}

function connection() {
  return {
    credentialsRef: {},
    displayName: "Official",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection_1",
    metadata: {},
    phone: null,
    provider: "composio_whatsapp" as const,
    status: "active" as const,
    storeId,
    tenantId,
    webhookUrl: null,
  };
}

function claimInput(now: Date) {
  return {
    connectionId: "connection_1",
    fingerprint: "fingerprint",
    idempotencyKey: "key_1",
    now,
    sessionId: "session_1",
    staleBefore: new Date(now.getTime() - 120_000),
    storeId,
    tenantId,
  };
}
