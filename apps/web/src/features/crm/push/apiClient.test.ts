import { describe, expect, it, vi } from "vitest";
import { createCrmPushApi } from "./apiClient";

describe("CRM push API", () => {
  it("uses store-scoped settings and user-global subscription routes", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          appId: "app-id",
          deliveryMode: "shadow",
          preference: { enabled: true },
          subscription: null,
        }),
      )
      .mockResolvedValue(new Response(null, { status: 204 }));
    const api = createCrmPushApi({
      baseUrl: "https://api.example.com/api/v1/",
      fetch: fetchMock,
      headers: () => ({ "x-store-slug": "loja-a" }),
    });

    await api.getSettings();
    await api.registerSubscription("subscription/id");
    await api.updatePreference(false);
    await api.disableSubscription("subscription/id", { keepalive: true });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.example.com/api/v1/crm/push/settings",
    );
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("x-store-slug"),
    ).toBe("loja-a");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.example.com/api/v1/crm/push/subscriptions",
      expect.objectContaining({
        body: '{"subscriptionId":"subscription/id"}',
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://api.example.com/api/v1/crm/push/preferences",
      expect.objectContaining({ body: '{"enabled":false}', method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "https://api.example.com/api/v1/crm/push/subscriptions/subscription%2Fid",
      expect.objectContaining({ keepalive: true, method: "DELETE" }),
    );
  });
});
