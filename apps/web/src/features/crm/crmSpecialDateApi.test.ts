import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCrmSpecialDateApi,
  crmSpecialDateRoutes,
} from "./crmSpecialDateApi";
import { CRM_SPECIAL_DATE_TYPES } from "./crmSpecialDateTypes";

describe("crmSpecialDateApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the complete connection-scoped configuration envelope", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ configs: makeConfigs("42") }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }),
    );
    const api = createCrmSpecialDateApi({
      auth: { clerkUserId: "clerk_user", storeSlug: "store" },
      baseUrl: "https://crm.example.test/api/v1",
      fetch,
    });

    const result = await api.getConfigs("42");

    expect(result.configs).toHaveLength(7);
    expect(fetch).toHaveBeenCalledWith(
      crmSpecialDateRoutes.configs("42", "https://crm.example.test/api/v1"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-clerk-user-id": "clerk_user",
          "x-store-slug": "store",
        }) as Record<string, string>,
        method: "GET",
      }) as RequestInit,
    );
  });

  it("updates one date with the exact PUT contract", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            config: {
              ...makeConfigs("42")[0],
              dateType: "birthday",
              enabled: true,
              leadDays: 2,
              messageTemplate: "Olá, {nome}!",
              sendTime: "10:30",
            },
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 },
        ),
    );
    const api = createCrmSpecialDateApi({ fetch });

    await api.updateConfig("42", "birthday", {
      enabled: true,
      leadDays: 2,
      messageTemplate: "Olá, {nome}!",
      sendTime: "10:30",
    });

    expect(fetch).toHaveBeenCalledWith(
      crmSpecialDateRoutes.config("42", "birthday"),
      expect.objectContaining({
        body: JSON.stringify({
          enabled: true,
          leadDays: 2,
          messageTemplate: "Olá, {nome}!",
          sendTime: "10:30",
        }),
        method: "PUT",
      }),
    );
  });
});

function makeConfigs(connectionId: string) {
  return CRM_SPECIAL_DATE_TYPES.map((dateType) => ({
    connectionId,
    dateType,
    enabled: false,
    leadDays: 0,
    messageTemplate: "Mensagem para {nome}.",
    sendTime: "09:00",
  }));
}
