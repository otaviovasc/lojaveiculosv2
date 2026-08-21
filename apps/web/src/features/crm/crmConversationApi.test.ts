import { describe, expect, it } from "vitest";
import { crmChannelConnectionSchema } from "@lojaveiculosv2/shared";
import { createCrmConversationApi } from "./crmConversationApi";

type FetchCall = {
  init: RequestInit | undefined;
  input: RequestInfo | URL;
};

function createFakeFetch(payloads: unknown[]) {
  const calls: FetchCall[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    calls.push({ init, input });
    return new Response(JSON.stringify(payloads.shift() ?? {}), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  };
  return { calls, fetch: fakeFetch };
}

describe("CRM WhatsApp API", () => {
  it("uses product auth headers and posts text messages through V2", async () => {
    const fake = createFakeFetch([{ id: 99 }]);
    const api = createCrmConversationApi({
      auth: {
        accessToken: "clerk-token",
        clerkUserId: "clerk_1",
        storeSlug: "test-store",
      },
      fetch: fake.fetch,
    });

    await api.sendText({ cycleId: "session_1", text: "Ola" });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/conversation-cycles/session_1/messages",
      init: {
        body: JSON.stringify({ content: "Ola" }),
        method: "POST",
      },
    });
    expect(fake.calls[0]?.init?.headers).toMatchObject({
      Authorization: "Bearer clerk-token",
      "x-clerk-user-id": "clerk_1",
      "x-store-slug": "test-store",
    });
  });

  it("posts the OLX Chat setup retry through the canonical route", async () => {
    const fake = createFakeFetch([
      {
        channel: "olx_chat",
        connectionId: "connection_1",
        diagnostics: {
          httpStatus: 200,
          providerRequestId: "op-1",
          retryable: false,
        },
        provider: "olx",
        readiness: { ready: true },
        setup: {
          attemptCount: 2,
          configuredAt: "2026-08-17T12:00:00.000Z",
          status: "configured",
        },
      },
    ]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    const result = await api.retryOlxChatSetup("connection_1");

    expect(fake.calls[0]).toMatchObject({
      input:
        "/api/v1/crm/channel-connections/connection_1/olx-chat/setup/retry",
      init: { body: "{}", method: "POST" },
    });
    expect(result.diagnostics.providerRequestId).toBe("op-1");
  });

  it("posts quoted text messages through V2", async () => {
    const fake = createFakeFetch([{ id: "message_2" }]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await api.sendText({
      replyToMessageId: "550e8400-e29b-41d4-a716-446655440000",
      cycleId: "session_1",
      text: "Sim, esta disponivel.",
    });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/conversation-cycles/session_1/messages",
      init: {
        body: JSON.stringify({
          content: "Sim, esta disponivel.",
          replyToMessageId: "550e8400-e29b-41d4-a716-446655440000",
        }),
        method: "POST",
      },
    });
  });

  it("starts WhatsApp conversations through V2", async () => {
    const fake = createFakeFetch([{ cycle: { id: "session_1" } }]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await api.startConversation({
      customerDisplayName: "Ana",
      connectionId: "connection_1",
      phone: "(11) 99999-9999",
      text: "Ola",
    });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/conversation-cycles/start",
      init: {
        body: JSON.stringify({
          customerDisplayName: "Ana",
          connectionId: "connection_1",
          phone: "(11) 99999-9999",
          text: "Ola",
        }),
        method: "POST",
      },
    });
  });

  it("posts media messages through V2", async () => {
    const fake = createFakeFetch([{ id: 100 }, { id: 101 }]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await api.sendMedia({
      base64: "aW1hZ2U=",
      caption: "Foto",
      fileName: "foto.jpg",
      mediaType: "image",
      mimeType: "image/jpeg",
      cycleId: "session_1",
    });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/conversation-cycles/session_1/messages/media",
      init: {
        body: JSON.stringify({
          base64: "aW1hZ2U=",
          caption: "Foto",
          fileName: "foto.jpg",
          mediaType: "image",
          mimeType: "image/jpeg",
        }),
        method: "POST",
      },
    });

    await api.sendMedia({
      base64: "dmlkZW8=",
      caption: "Video",
      fileName: "video.mp4",
      mediaType: "video",
      mimeType: "video/mp4",
      cycleId: "session_1",
    });

    expect(fake.calls[1]).toMatchObject({
      input: "/api/v1/crm/conversation-cycles/session_1/messages/media",
      init: {
        body: JSON.stringify({
          base64: "dmlkZW8=",
          caption: "Video",
          fileName: "video.mp4",
          mediaType: "video",
          mimeType: "video/mp4",
        }),
        method: "POST",
      },
    });
  });

  it("loads WhatsApp connections through V2", async () => {
    const connection = canonicalConnection();
    const fake = createFakeFetch([
      {
        allowance: { limit: 1, remaining: 0, used: 1 },
        availableSetups: [],
        connections: [connection],
      },
    ]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await expect(api.listConnections()).resolves.toEqual({
      allowance: { limit: 1, remaining: 0, used: 1 },
      availableSetups: [],
      connections: [
        {
          ...connection,
          capabilities: canonicalConnection().capabilities,
        },
      ],
    });
    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/channel-connections",
      init: { method: "GET" },
    });
  });

  it("keeps Meta WhatsApp and Instagram setup availability distinct", async () => {
    const availableSetups = [
      { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
      { broker: "composio", channel: "instagram", provider: "meta_cloud" },
    ] as const;
    const fake = createFakeFetch([
      {
        allowance: { limit: 3, remaining: 2, used: 1 },
        availableSetups,
        connections: [canonicalConnection()],
      },
    ]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await expect(api.listConnections()).resolves.toMatchObject({
      availableSetups,
    });
  });

  it.each(["channel", "readiness", "capabilities"] as const)(
    "rejects a connection DTO missing %s",
    async (field) => {
      const connection: Record<string, unknown> = canonicalConnection();
      delete connection[field];
      const fake = createFakeFetch([
        {
          allowance: { limit: 1, remaining: 0, used: 1 },
          availableSetups: [],
          connections: [connection],
        },
      ]);
      const api = createCrmConversationApi({ fetch: fake.fetch });

      await expect(api.listConnections()).rejects.toThrow();
    },
  );

  it.each([
    ["whatsapp", "zapi", "WhatsApp Z-API"],
    ["instagram", "meta_cloud", "Instagram"],
    ["olx_chat", "olx", "OLX Chat"],
  ] as const)(
    "accepts a canonical %s/%s connection DTO",
    async (channel, provider, displayName) => {
      const connection = canonicalConnection({
        channel,
        displayName,
        provider,
      });
      const fake = createFakeFetch([connectionOverview([connection])]);
      const api = createCrmConversationApi({ fetch: fake.fetch });

      await expect(api.listConnections()).resolves.toMatchObject({
        connections: [
          {
            channel,
            displayName,
            provider,
            capabilities: canonicalConnection().capabilities,
          },
        ],
      });
    },
  );

  it("accepts the same canonical fixture enforced by the shared schema", async () => {
    const connection = canonicalConnection();
    expect(crmChannelConnectionSchema.parse(connection)).toEqual(connection);
    const api = createCrmConversationApi({
      fetch: createFakeFetch([connectionOverview([connection])]).fetch,
    });

    await expect(api.listConnections()).resolves.toMatchObject({
      connections: [
        {
          id: "connection_1",
          provider: "zapi",
          capabilities: canonicalConnection().capabilities,
        },
      ],
    });
  });

  it("retains persisted Z-API webhook setup state in connection overview reads", async () => {
    const connection = canonicalConnection({ setup: configuredZapiSetup() });
    const api = createCrmConversationApi({
      fetch: createFakeFetch([connectionOverview([connection])]).fetch,
    });

    await expect(api.listConnections()).resolves.toMatchObject({
      connections: [
        {
          id: "connection_1",
          setup: { status: "configured", version: 2 },
        },
      ],
    });
  });

  it("uses the self-service connection and provider setup contracts", async () => {
    const fake = createFakeFetch([
      { id: "connection_1" },
      { results: [], setup: { status: "configured" } },
      { qrCode: "data:image/png;base64,qr" },
      { code: "123456", requested: true },
      { id: "connection_1", status: "disconnected" },
      { id: "connection_1", status: "active" },
      { redirectUrl: "https://connect.composio.dev/cycle/test" },
      { connection: { id: "connection_2" }, senders: [] },
      { id: "connection_2", status: "active" },
    ]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await api.createConnection({
      channel: "whatsapp",
      provider: "meta_cloud",
    });
    await api.configureZapiWebhooks("connection_1");
    await api.requestZapiPairingQr("connection_1");
    await api.requestZapiPairingCode("connection_1", "5511999999999");
    await api.disconnectZapiConnection("connection_1");
    await api.refreshZapiConnectionStatus("connection_1");
    await api.authorizeComposioConnection("connection_2");
    await api.completeComposioConnection("connection_2");
    await api.selectComposioSender("connection_2", "sender_1");

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/channel-connections",
      init: {
        body: JSON.stringify({
          channel: "whatsapp",
          provider: "meta_cloud",
        }),
        method: "POST",
      },
    });
    expect(fake.calls[1]).toMatchObject({
      input:
        "/api/v1/crm/channel-connections/connection_1/zapi/webhooks/configure",
      init: { body: "{}", method: "POST" },
    });
    expect(fake.calls[2]?.input).toBe(
      "/api/v1/crm/channel-connections/connection_1/zapi/pairing/qr",
    );
    expect(fake.calls[3]?.input).toBe(
      "/api/v1/crm/channel-connections/connection_1/zapi/pairing/code",
    );
    expect(fake.calls[3]?.init).toMatchObject({
      body: JSON.stringify({ phone: "5511999999999" }),
      method: "POST",
    });
    expect(fake.calls[4]).toMatchObject({
      input: "/api/v1/crm/channel-connections/connection_1/zapi/disconnect",
      init: { body: "{}", method: "POST" },
    });
    expect(fake.calls[5]).toMatchObject({
      input: "/api/v1/crm/channel-connections/connection_1/zapi/status/refresh",
      init: { body: "{}", method: "POST" },
    });
    expect(fake.calls[6]?.input).toBe(
      "/api/v1/crm/channel-connections/connection_2/composio/authorize",
    );
    expect(fake.calls[7]?.input).toBe(
      "/api/v1/crm/channel-connections/connection_2/composio/complete",
    );
    expect(fake.calls[8]).toMatchObject({
      input: "/api/v1/crm/channel-connections/connection_2/composio/sender",
      init: {
        body: JSON.stringify({ senderId: "sender_1" }),
        method: "POST",
      },
    });
  });

  it("loads WhatsApp conversationCycles, counts, and messages through V2", async () => {
    const fake = createFakeFetch([
      [{ channel: "whatsapp", id: "session_1", revision: 0, status: "ACTIVE" }],
      {
        assignees: [],
        filters: { all: 1, fresh: 0, mine: 0, others: 0, unassigned: 1 },
        inHumanService: 0,
        statuses: {
          ACTIVE: 1,
          COMPLETED: 0,
          EXPIRED: 0,
          HUMAN_TAKEOVER: 0,
          MINIBOT_ACTIVE: 0,
        },
        total: 1,
        unread: 1,
        waitingHuman: 0,
      },
      [
        {
          channel: "whatsapp",
          content: "Olá",
          createdAt: "2026-08-18T12:00:00.000Z",
          direction: "INBOUND",
          id: "message_1",
          senderOrigin: "customer",
          senderType: "CUSTOMER",
          status: "DELIVERED",
          type: "TEXT",
        },
      ],
    ]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await expect(
      api.listConversationCycles({
        connectionId: "connection_1",
        leadId: "lead_1",
        limit: 10,
      }),
    ).resolves.toEqual([
      { channel: "whatsapp", id: "session_1", revision: 0, status: "ACTIVE" },
    ]);
    await expect(
      api.listConversationCycleCounts({
        connectionId: "connection_1",
        unreadOnly: true,
      }),
    ).resolves.toMatchObject({ total: 1, unread: 1 });
    await expect(api.listMessages("session_1")).resolves.toEqual([
      expect.objectContaining({ id: "message_1", senderOrigin: "customer" }),
    ]);

    expect(fake.calls[0]?.input).toBe(
      "/api/v1/crm/conversation-cycles?connectionId=connection_1&leadId=lead_1&limit=10",
    );
    expect(fake.calls[1]?.input).toBe(
      "/api/v1/crm/conversation-cycles/counts?connectionId=connection_1&unreadOnly=true",
    );
    expect(fake.calls[2]?.input).toBe(
      "/api/v1/crm/conversation-cycles/session_1/messages",
    );
  });

  it("posts WhatsApp cycle actions through V2", async () => {
    const fake = createFakeFetch([
      {
        result: "applied",
        cycle: { id: "session_1", assignedUserId: "user_1" },
      },
      { result: "applied", cycle: { id: "session_1", status: "COMPLETED" } },
      {
        result: "applied",
        cycle: { id: "session_1", status: "HUMAN_TAKEOVER" },
      },
      { result: "applied", cycle: { id: "session_1", unreadCount: 0 } },
      { result: "applied", cycle: { id: "session_1", unreadCount: 1 } },
    ]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await expect(
      api.assignCycle("session_1", {
        assignedUserId: "user_1",
        commandId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toMatchObject({
      result: "applied",
      cycle: { assignedUserId: "user_1" },
    });
    await expect(
      api.closeCycle("session_1", {
        commandId: "22222222-2222-4222-8222-222222222222",
      }),
    ).resolves.toMatchObject({ cycle: { status: "COMPLETED" } });
    await expect(
      api.updateCycleAttendance("session_1", {
        enabled: true,
        commandId: "33333333-3333-4333-8333-333333333333",
      }),
    ).resolves.toMatchObject({ cycle: { status: "HUMAN_TAKEOVER" } });
    await expect(
      api.markCycleRead("session_1", {
        commandId: "44444444-4444-4444-8444-444444444444",
      }),
    ).resolves.toMatchObject({ cycle: { unreadCount: 0 } });
    await expect(
      api.markCycleUnread("session_1", {
        commandId: "55555555-5555-4555-8555-555555555555",
      }),
    ).resolves.toMatchObject({ cycle: { unreadCount: 1 } });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/conversation-cycles/session_1/actions/assign",
      init: {
        body: JSON.stringify({
          assignedUserId: "user_1",
          commandId: "11111111-1111-4111-8111-111111111111",
        }),
        method: "POST",
      },
    });
    expect(fake.calls[1]).toMatchObject({
      input: "/api/v1/crm/conversation-cycles/session_1/actions/close",
      init: {
        body: JSON.stringify({
          commandId: "22222222-2222-4222-8222-222222222222",
        }),
        method: "POST",
      },
    });
    expect(fake.calls[2]).toMatchObject({
      input: "/api/v1/crm/conversation-cycles/session_1/attendance",
      init: {
        body: JSON.stringify({
          enabled: true,
          commandId: "33333333-3333-4333-8333-333333333333",
        }),
        method: "POST",
      },
    });
    expect(fake.calls[3]).toMatchObject({
      input: "/api/v1/crm/conversation-cycles/session_1/actions/read",
      init: {
        body: JSON.stringify({
          commandId: "44444444-4444-4444-8444-444444444444",
        }),
        method: "POST",
      },
    });
    expect(fake.calls[4]).toMatchObject({
      input: "/api/v1/crm/conversation-cycles/session_1/actions/unread",
      init: {
        body: JSON.stringify({
          commandId: "55555555-5555-4555-8555-555555555555",
        }),
        method: "POST",
      },
    });
  });

  it("posts WhatsApp message actions through V2", async () => {
    const fake = createFakeFetch([
      { id: "message_1", metadata: { reaction: { value: "👍" } } },
      { id: "message_1", metadata: { reactionRemoved: {} } },
      { deletedAt: "2026-07-02T19:00:00.000Z", id: "message_1" },
    ]);
    const api = createCrmConversationApi({ fetch: fake.fetch });

    await expect(
      api.sendReaction("message_1", { reaction: "👍" }),
    ).resolves.toMatchObject({ id: "message_1" });
    await expect(api.removeReaction("message_1")).resolves.toMatchObject({
      id: "message_1",
    });
    await expect(api.deleteMessage("message_1")).resolves.toMatchObject({
      id: "message_1",
    });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/messages/message_1/reaction",
      init: {
        body: JSON.stringify({ reaction: "👍" }),
        method: "POST",
      },
    });
    expect(fake.calls[1]).toMatchObject({
      input: "/api/v1/crm/messages/message_1/reaction",
      init: { method: "DELETE" },
    });
    expect(fake.calls[2]).toMatchObject({
      input: "/api/v1/crm/messages/message_1",
      init: { method: "DELETE" },
    });
  });
});

function canonicalConnection(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    capabilities: ["inbound", "outbound", "scheduling"],
    channel: "whatsapp",
    displayName: "WhatsApp Z-API",
    id: "connection_1",
    isDefault: false,
    provider: "zapi",
    readiness: { ready: true, reason: null, reasonCode: "ready" },
    state: "active",
    ...overrides,
  };
}

function connectionOverview(connections: Record<string, unknown>[]) {
  return {
    allowance: {
      limit: connections.length,
      remaining: 0,
      used: connections.length,
    },
    availableSetups: [],
    connections,
  };
}

function configuredZapiSetup() {
  return {
    attemptCount: 2,
    configuredAt: "2026-08-19T18:01:00.000Z",
    lastErrorCode: null,
    leaseExpiresAt: null,
    leaseOwner: null,
    requestedAt: "2026-08-19T18:00:00.000Z",
    requiredTypes: [
      "chat-presence",
      "connected",
      "delivery",
      "disconnected",
      "received",
      "status",
    ],
    status: "configured",
    succeededTypes: [
      "chat-presence",
      "connected",
      "delivery",
      "disconnected",
      "received",
      "status",
    ],
    supportCode: "ZAPI-CONNECTION",
    updatedAt: "2026-08-19T18:01:00.000Z",
    version: 2,
  };
}
