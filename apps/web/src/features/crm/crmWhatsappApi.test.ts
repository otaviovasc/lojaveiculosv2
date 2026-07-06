import { describe, expect, it } from "vitest";
import { createCrmWhatsappApi } from "./crmWhatsappApi";

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
    const api = createCrmWhatsappApi({
      auth: {
        accessToken: "clerk-token",
        clerkUserId: "clerk_1",
        storeSlug: "test-store",
      },
      fetch: fake.fetch,
    });

    await api.sendText({ sessionId: "session_1", text: "Ola" });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/whatsapp/send/text",
      init: {
        body: JSON.stringify({ sessionId: "session_1", text: "Ola" }),
        method: "POST",
      },
    });
    expect(fake.calls[0]?.init?.headers).toMatchObject({
      Authorization: "Bearer clerk-token",
      "x-clerk-user-id": "clerk_1",
      "x-store-slug": "test-store",
    });
  });

  it("posts quoted text messages through V2", async () => {
    const fake = createFakeFetch([{ id: "message_2" }]);
    const api = createCrmWhatsappApi({ fetch: fake.fetch });

    await api.sendText({
      replyToMessageId: "550e8400-e29b-41d4-a716-446655440000",
      sessionId: "session_1",
      text: "Sim, esta disponivel.",
    });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/whatsapp/send/text",
      init: {
        body: JSON.stringify({
          replyToMessageId: "550e8400-e29b-41d4-a716-446655440000",
          sessionId: "session_1",
          text: "Sim, esta disponivel.",
        }),
        method: "POST",
      },
    });
  });

  it("starts WhatsApp conversations through V2", async () => {
    const fake = createFakeFetch([{ session: { id: "session_1" } }]);
    const api = createCrmWhatsappApi({ fetch: fake.fetch });

    await api.startConversation({
      buyerName: "Ana",
      connectionId: "connection_1",
      phone: "(11) 99999-9999",
      text: "Ola",
    });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/whatsapp/conversations/start",
      init: {
        body: JSON.stringify({
          buyerName: "Ana",
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
    const api = createCrmWhatsappApi({ fetch: fake.fetch });

    await api.sendMedia({
      base64: "aW1hZ2U=",
      caption: "Foto",
      fileName: "foto.jpg",
      mediaType: "image",
      mimeType: "image/jpeg",
      sessionId: "session_1",
    });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/whatsapp/send/media",
      init: {
        body: JSON.stringify({
          base64: "aW1hZ2U=",
          caption: "Foto",
          fileName: "foto.jpg",
          mediaType: "image",
          mimeType: "image/jpeg",
          sessionId: "session_1",
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
      sessionId: "session_1",
    });

    expect(fake.calls[1]).toMatchObject({
      input: "/api/v1/crm/whatsapp/send/media",
      init: {
        body: JSON.stringify({
          base64: "dmlkZW8=",
          caption: "Video",
          fileName: "video.mp4",
          mediaType: "video",
          mimeType: "video/mp4",
          sessionId: "session_1",
        }),
        method: "POST",
      },
    });
  });

  it("loads WhatsApp connections through V2", async () => {
    const fake = createFakeFetch([{ connections: [{ id: "connection_1" }] }]);
    const api = createCrmWhatsappApi({ fetch: fake.fetch });

    await expect(api.listConnections()).resolves.toEqual({
      connections: [{ id: "connection_1" }],
    });
    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/whatsapp/connections",
      init: { method: "GET" },
    });
  });

  it("loads WhatsApp sessions, counts, and messages through V2", async () => {
    const fake = createFakeFetch([
      [{ id: "session_1" }],
      { filters: { all: 1 }, total: 1, unread: 1 },
      [{ id: "message_1" }],
    ]);
    const api = createCrmWhatsappApi({ fetch: fake.fetch });

    await expect(
      api.listSessions({ connectionId: "connection_1", limit: 10 }),
    ).resolves.toEqual([{ id: "session_1" }]);
    await expect(
      api.listSessionCounts({ connectionId: "connection_1", unreadOnly: true }),
    ).resolves.toMatchObject({ total: 1, unread: 1 });
    await expect(api.listMessages("session_1")).resolves.toEqual([
      { id: "message_1" },
    ]);

    expect(fake.calls[0]?.input).toBe(
      "/api/v1/crm/whatsapp/sessions?connectionId=connection_1&limit=10",
    );
    expect(fake.calls[1]?.input).toBe(
      "/api/v1/crm/whatsapp/session-counts?connectionId=connection_1&unreadOnly=true",
    );
    expect(fake.calls[2]?.input).toBe(
      "/api/v1/crm/whatsapp/messages/session_1",
    );
  });

  it("posts WhatsApp session actions through V2", async () => {
    const fake = createFakeFetch([
      { id: "session_1", assignedUserId: "user_1" },
      { id: "session_1", status: "COMPLETED" },
      { id: "session_1", status: "HUMAN_TAKEOVER" },
      { id: "session_1", unreadCount: 0 },
      { id: "session_1", unreadCount: 1 },
    ]);
    const api = createCrmWhatsappApi({ fetch: fake.fetch });

    await expect(
      api.assignSession("session_1", { assignedUserId: "user_1" }),
    ).resolves.toMatchObject({ assignedUserId: "user_1" });
    await expect(api.closeSession("session_1")).resolves.toMatchObject({
      status: "COMPLETED",
    });
    await expect(
      api.interveneSession("session_1", { enabled: true }),
    ).resolves.toMatchObject({ status: "HUMAN_TAKEOVER" });
    await expect(api.markSessionRead("session_1")).resolves.toMatchObject({
      unreadCount: 0,
    });
    await expect(api.markSessionUnread("session_1")).resolves.toMatchObject({
      unreadCount: 1,
    });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/whatsapp/sessions/session_1/assign",
      init: {
        body: JSON.stringify({ assignedUserId: "user_1" }),
        method: "POST",
      },
    });
    expect(fake.calls[1]).toMatchObject({
      input: "/api/v1/crm/whatsapp/sessions/session_1/close",
      init: { body: JSON.stringify({}), method: "POST" },
    });
    expect(fake.calls[2]).toMatchObject({
      input: "/api/v1/crm/whatsapp/sessions/session_1/intervention",
      init: { body: JSON.stringify({ enabled: true }), method: "POST" },
    });
    expect(fake.calls[3]).toMatchObject({
      input: "/api/v1/crm/whatsapp/sessions/session_1/read",
      init: { body: JSON.stringify({}), method: "POST" },
    });
    expect(fake.calls[4]).toMatchObject({
      input: "/api/v1/crm/whatsapp/sessions/session_1/unread",
      init: { body: JSON.stringify({}), method: "POST" },
    });
  });

  it("posts WhatsApp message actions through V2", async () => {
    const fake = createFakeFetch([
      { id: "message_1", metadata: { reaction: { value: "👍" } } },
      { id: "message_1", metadata: { reactionRemoved: {} } },
      { deletedAt: "2026-07-02T19:00:00.000Z", id: "message_1" },
    ]);
    const api = createCrmWhatsappApi({ fetch: fake.fetch });

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
      input: "/api/v1/crm/whatsapp/messages/message_1/reaction",
      init: {
        body: JSON.stringify({ reaction: "👍" }),
        method: "POST",
      },
    });
    expect(fake.calls[1]).toMatchObject({
      input: "/api/v1/crm/whatsapp/messages/message_1/reaction",
      init: { method: "DELETE" },
    });
    expect(fake.calls[2]).toMatchObject({
      input: "/api/v1/crm/whatsapp/messages/message_1",
      init: { method: "DELETE" },
    });
  });
});
