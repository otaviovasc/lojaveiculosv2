import { describe, expect, it, vi } from "vitest";
import { createComposioCrmConnectionSetupProvider } from "./composioCrmConnectionSetupProvider.js";

const baseEnv = {
  COMPOSIO_API_BASE_URL: "https://composio.test",
  COMPOSIO_API_KEY: "composio-secret",
  COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID: "ac_instagram",
  COMPOSIO_META_GRAPH_VERSION: "v24.0",
  PUBLIC_APP_URL: "https://app.example.test",
};

describe("Composio Instagram setup", () => {
  it("uses the Instagram auth config and channel-neutral callback", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({
        connected_account_id: "ca_ig",
        expires_at: "2026-08-19T12:00:00Z",
        redirect_url: "https://connect.composio.dev/instagram",
      }),
    );
    const provider = createComposioCrmConnectionSetupProvider(
      { ...baseEnv, COMPOSIO_INSTAGRAM_LOGIN_MODE: "instagram" },
      fetchImpl,
    );

    await provider.createConnectLink({
      channel: "instagram",
      userId: "tenant:store",
    });

    expect(
      JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)),
    ).toMatchObject({
      auth_config_id: "ac_instagram",
      callback_url: "https://app.example.test/#/crm",
    });
  });

  it("fails closed before authorization when the login contract is unresolved", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const provider = createComposioCrmConnectionSetupProvider(
      baseEnv,
      fetchImpl,
    );

    await expect(
      provider.createConnectLink({
        channel: "instagram",
        userId: "tenant:store",
      }),
    ).rejects.toMatchObject({ code: "configuration_error" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("keeps Facebook Page subscription targets distinct from IG senders", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(facebookDiscoveryResponse())
      .mockResolvedValueOnce(facebookDiscoveryResponse())
      .mockResolvedValueOnce(
        Response.json({
          data: {
            access_token: "page-access-token",
            instagram_business_account: { id: "ig_1" },
          },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ data: { success: "true" }, status: 200 }),
      );
    const provider = createComposioCrmConnectionSetupProvider(
      { ...baseEnv, COMPOSIO_INSTAGRAM_LOGIN_MODE: "facebook" },
      fetchImpl,
    );
    const discover = requireMethod(provider.discoverInstagramResources);
    const subscribe = requireMethod(provider.subscribeInstagramApp);

    await expect(discover("ca_ig")).resolves.toEqual({
      senders: [
        expect.objectContaining({
          loginMode: "facebook",
          pageId: "page_1",
          senderId: "ig_1",
          subscriptionFields: ["messages"],
          subscriptionTargetId: "page_1",
        }),
      ],
    });
    await expect(
      subscribe({
        connectedAccountId: "ca_ig",
        senderId: "ig_1",
        subscriptionTargetId: "page_1",
      }),
    ).resolves.toEqual({
      fields: ["messages"],
      subscribed: true,
      targetId: "page_1",
    });
    const subscriptionBody: unknown = JSON.parse(
      String(fetchImpl.mock.calls[3]?.[1]?.body),
    );
    expect(subscriptionBody).toMatchObject({
      endpoint: "https://graph.facebook.com/v24.0/page_1/subscribed_apps",
      method: "POST",
      parameters: [
        { in: "query", name: "subscribed_fields", value: "messages" },
        {
          in: "query",
          name: "access_token",
          value: "page-access-token",
        },
      ],
    });
  });

  it("uses the Instagram Login identity and direct subscription fields", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(instagramDiscoveryResponse())
      .mockResolvedValueOnce(instagramDiscoveryResponse())
      .mockResolvedValueOnce(
        Response.json({ data: { success: true }, status: 200 }),
      );
    const provider = createComposioCrmConnectionSetupProvider(
      { ...baseEnv, COMPOSIO_INSTAGRAM_LOGIN_MODE: "instagram" },
      fetchImpl,
    );
    const discover = requireMethod(provider.discoverInstagramResources);
    const subscribe = requireMethod(provider.subscribeInstagramApp);

    await expect(discover("ca_ig")).resolves.toEqual({
      senders: [
        expect.objectContaining({
          loginMode: "instagram",
          pageId: null,
          senderId: "ig_2",
          subscriptionTargetId: "ig_2",
        }),
      ],
    });
    await expect(
      subscribe({
        connectedAccountId: "ca_ig",
        senderId: "ig_2",
        subscriptionTargetId: "ig_2",
      }),
    ).resolves.toEqual({
      fields: ["messages", "messaging_postbacks"],
      subscribed: true,
      targetId: "ig_2",
    });
    expect(
      JSON.parse(String(fetchImpl.mock.calls[2]?.[1]?.body)),
    ).toMatchObject({
      endpoint: "https://graph.instagram.com/v24.0/ig_2/subscribed_apps",
      method: "POST",
    });
  });
});

function facebookDiscoveryResponse() {
  return Response.json({
    data: {
      data: [
        {
          id: "page_1",
          instagram_business_account: {
            id: "ig_1",
            name: "Dealer",
            username: "dealer",
          },
          name: "Dealer Page",
          tasks: ["MESSAGING"],
        },
      ],
    },
    status: 200,
  });
}

function instagramDiscoveryResponse() {
  return Response.json({
    data: { user_id: "ig_2", username: "dealer.direct" },
    status: 200,
  });
}

function requireMethod<T>(method: T | undefined): T {
  if (!method) throw new Error("Expected Composio Instagram setup method");
  return method;
}
