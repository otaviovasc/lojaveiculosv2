import { describe, expect, it } from "vitest";
import {
  createCrmWhatsappApi,
  createCrmWhatsappSessionQuery,
  crmWhatsappRoutes,
} from "./crmWhatsappApi";

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
  it("builds V2 WhatsApp routes", () => {
    expect(crmWhatsappRoutes.bootstrap()).toBe("/api/v1/crm/whatsapp/bootstrap");
    expect(crmWhatsappRoutes.sessions()).toBe("/api/v1/crm/whatsapp/sessions");
    expect(crmWhatsappRoutes.messages(42)).toBe(
      "/api/v1/crm/whatsapp/messages/42",
    );
    expect(crmWhatsappRoutes.sendText()).toBe("/api/v1/crm/whatsapp/send/text");
  });

  it("serializes inbox session queries", () => {
    expect(
      createCrmWhatsappSessionQuery({
        connectionId: 7,
        limit: 40,
        offset: 80,
        search: "maria",
        sessionId: 123,
      }).toString(),
    ).toBe("connectionId=7&limit=40&offset=80&search=maria&sessionId=123");
  });

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

    await api.sendText({ sessionId: 42, text: "Ola" });

    expect(fake.calls[0]).toMatchObject({
      input: "/api/v1/crm/whatsapp/send/text",
      init: {
        body: JSON.stringify({ sessionId: 42, text: "Ola" }),
        method: "POST",
      },
    });
    expect(fake.calls[0]?.init?.headers).toMatchObject({
      Authorization: "Bearer clerk-token",
      "x-clerk-user-id": "clerk_1",
      "x-store-slug": "test-store",
    });
  });
});
