import { describe, expect, it, vi } from "vitest";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmCanonicalInboundRepository } from "../adapters/memory/crmCanonicalInboundRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  createOlxConnection,
  olxSecurity,
  postOlx,
  storeId,
  tenantId,
  validPayload,
} from "./crm.olxChat.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

describe("CRM OLX Chat runtime", () => {
  it("authenticates and persists idempotently only in canonical CRM", async () => {
    const crmRepository = createMemoryCrmRepository();
    const conversationRepository = createMemoryCrmConversationRepository();
    const canonicalRepository = createMemoryCrmCanonicalInboundRepository(
      conversationRepository,
    );
    const publish = vi.fn(async () => undefined);
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmCanonicalInboundRepository: canonicalRepository,
      crmRealtimePublisher: { publish },
      crmRepository,
      crmConversationRepository: conversationRepository,
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
    const cycles = await conversationRepository.listConversationCycles({
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(cycles).toHaveLength(1);
    await expect(
      crmRepository.listLeads({ limit: 10, offset: 0, storeId, tenantId }),
    ).resolves.toMatchObject([
      { buyerEmail: "ana@example.com", source: "olx" },
    ]);
    expect(canonicalRepository.snapshot()).toMatchObject({
      attendances: [],
      cycles: [],
      messages: [],
      threads: [],
    });
    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ storeId, tenantId, type: "message" }),
    );
  });

  it("rejects another connection secret before parsing or persistence", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmConversationRepository: conversationRepository,
      entitlements: ["crm"],
      crmOlxWebhookSecurity: olxSecurity(),
      olxChatEnabled: true,
    });

    const response = await postOlx(app, validPayload(), "other-store-secret");

    expect(response.status).toBe(403);
    await expect(
      conversationRepository.listConversationCycles({
        limit: 10,
        offset: 0,
        storeId,
        tenantId,
      }),
    ).resolves.toEqual([]);
  });

  it("binds the authenticated connection scope before entitlement resolution", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const resolveBotEntitlements = vi.fn<ResolveCrmBotEntitlements>(
      async ({
        context,
        storeId: resolvedStoreId,
        tenantId: resolvedTenantId,
      }) => {
        expect(context).toMatchObject({
          actor: { id: "olx_chat", kind: "integration" },
          permissions: ["crm.messages.ingest", "crm.conversations.manage"],
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
      crmConversationRepository: conversationRepository,
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
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmOlxWebhookSecurity: olxSecurity(),
      crmConversationRepository: conversationRepository,
      olxChatEnabled: true,
      resolveBotEntitlements: async ({ context }) => {
        expect(context).toMatchObject({ storeId, tenantId });
        return [];
      },
    });

    const response = await postOlx(app, validPayload());

    expect(response.status).toBe(403);
    await expect(
      conversationRepository.listConversationCycles({
        limit: 10,
        offset: 0,
        storeId,
        tenantId,
      }),
    ).resolves.toEqual([]);
  });

  it("ignores seller events without creating a CRM cycle", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmConversationRepository: conversationRepository,
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
      crmConversationRepository: createMemoryCrmConversationRepository(),
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
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createOlxConnection(),
      ]),
      crmOlxWebhookSecurity: olxSecurity(),
      crmConversationRepository: conversationRepository,
      entitlements: ["crm"],
      olxChatEnabled: true,
    });

    const response = await postOlx(app, {
      ...validPayload(),
      messageTimestamp: timestamp,
    });

    expect(response.status).toBe(400);
    await expect(
      conversationRepository.listConversationCycles({
        limit: 10,
        offset: 0,
        storeId,
        tenantId,
      }),
    ).resolves.toEqual([]);
  });
});
