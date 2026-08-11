import { describe, expect, it, vi } from "vitest";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createOlxConnection,
  olxSecurity,
  postOlx,
  storeId,
  tenantId,
  validPayload,
} from "./crm.olxChat.testSupport.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

describe("CRM OLX Chat runtime", () => {
  it("authenticates, links a lead, persists idempotently, and publishes realtime once", async () => {
    const crmRepository = createMemoryCrmRepository();
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const publish = vi.fn(async () => undefined);
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmRealtimePublisher: { publish },
      crmRepository,
      crmWhatsappRepository: whatsappRepository,
      entitlements: ["crm"],
      crmOlxWebhookSecurity: olxSecurity(),
      olxChatEnabled: true,
    });

    const first = await postOlx(app, validPayload());
    const duplicate = await postOlx(app, validPayload());

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(200);
    await expect(duplicate.json()).resolves.toMatchObject({
      status: "duplicate",
    });
    const sessions = await whatsappRepository.listSessions({
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      channel: "OLX_CHAT",
      channelExternalId: "olx-chat-1",
    });
    expect(typeof sessions[0]?.leadId).toBe("string");
    await expect(
      whatsappRepository.listMessages({
        limit: 10,
        offset: 0,
        sessionId: sessions[0]!.id,
        storeId,
        tenantId,
      }),
    ).resolves.toMatchObject([
      {
        channel: "OLX_CHAT",
        content: "Tenho interesse no carro",
        externalId: "olx-message-1",
      },
    ]);
    await expect(
      crmRepository.listLeads({ limit: 10, offset: 0, storeId, tenantId }),
    ).resolves.toMatchObject([
      { buyerEmail: "ana@example.com", source: "olx" },
    ]);
    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId,
        tenantId,
        type: "message",
      }),
    );
  });

  it("rejects another connection secret before parsing or persistence", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
      entitlements: ["crm"],
      crmOlxWebhookSecurity: olxSecurity(),
      olxChatEnabled: true,
    });

    const response = await postOlx(app, validPayload(), "other-store-secret");

    expect(response.status).toBe(403);
    await expect(
      whatsappRepository.listSessions({
        limit: 10,
        offset: 0,
        storeId,
        tenantId,
      }),
    ).resolves.toEqual([]);
  });

  it("binds the authenticated connection scope before entitlement resolution", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const resolveBotEntitlements = vi.fn<ResolveCrmBotEntitlements>(
      async ({
        context,
        storeId: resolvedStoreId,
        tenantId: resolvedTenantId,
      }) => {
        expect(context).toMatchObject({
          actor: { id: "olx_chat", kind: "integration" },
          permissions: ["crm.whatsapp.ingest"],
          storeId: resolvedStoreId,
          tenantId: resolvedTenantId,
        });
        return ["crm"] as const;
      },
    );
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmOlxWebhookSecurity: olxSecurity(),
      crmWhatsappRepository: whatsappRepository,
      olxChatEnabled: true,
      resolveBotEntitlements,
    });

    const response = await postOlx(app, validPayload());

    expect(response.status).toBe(201);
    expect(resolveBotEntitlements).toHaveBeenCalledWith(
      expect.objectContaining({ storeId, tenantId }),
    );
  });

  it("fails closed before ingestion when the authenticated store lacks CRM", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmOlxWebhookSecurity: olxSecurity(),
      crmWhatsappRepository: whatsappRepository,
      olxChatEnabled: true,
      resolveBotEntitlements: async ({ context }) => {
        expect(context).toMatchObject({ storeId, tenantId });
        return [];
      },
    });

    const response = await postOlx(app, validPayload());

    expect(response.status).toBe(403);
    await expect(
      whatsappRepository.listSessions({
        limit: 10,
        offset: 0,
        storeId,
        tenantId,
      }),
    ).resolves.toEqual([]);
  });

  it("ignores seller events without creating a CRM session", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
      entitlements: ["crm"],
      crmOlxWebhookSecurity: olxSecurity(),
      olxChatEnabled: true,
    });
    const response = await postOlx(app, {
      ...validPayload(),
      origin: "seller",
      senderType: "account",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      reason: "non_buyer_message",
      status: "ignored",
    });
  });

  it("accepts system-delivered messages when the origin is the buyer", async () => {
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmOlxWebhookSecurity: olxSecurity(),
      crmWhatsappRepository: createMemoryCrmWhatsappRepository(),
      entitlements: ["crm"],
      olxChatEnabled: true,
    });

    const response = await postOlx(app, {
      ...validPayload(),
      senderType: "system",
    });

    expect(response.status).toBe(201);
  });

  it.each([
    ["stale", "2026-08-10T11:50:00.000Z"],
    ["future", "2026-08-10T12:02:01.000Z"],
  ])("rejects a %s OLX event before persistence", async (_label, timestamp) => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmOlxWebhookSecurity: olxSecurity(),
      crmWhatsappRepository: whatsappRepository,
      entitlements: ["crm"],
      olxChatEnabled: true,
    });

    const response = await postOlx(app, {
      ...validPayload(),
      messageTimestamp: timestamp,
    });

    expect(response.status).toBe(400);
    await expect(
      whatsappRepository.listSessions({
        limit: 10,
        offset: 0,
        storeId,
        tenantId,
      }),
    ).resolves.toEqual([]);
  });
});
