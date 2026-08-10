import { describe, expect, it, vi } from "vitest";
import { createComposioCrmConnectionSetupProvider } from "./composioCrmConnectionSetupProvider.js";

const env = {
  COMPOSIO_API_BASE_URL: "https://composio.test",
  COMPOSIO_API_KEY: "composio-secret",
  COMPOSIO_WHATSAPP_AUTH_CONFIG_ID: "ac_whatsapp",
};

describe("createComposioCrmConnectionSetupProvider", () => {
  it("creates a v3.1 Connect Link without exposing the API key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json(
        {
          connected_account_id: "ca_1",
          expires_at: "2026-08-07T12:00:00Z",
          link_token: "not-returned",
          redirect_url: "https://connect.composio.dev/link",
        },
        { status: 201 },
      ),
    );
    const provider = createComposioCrmConnectionSetupProvider(env, fetchImpl);

    await expect(
      provider.createConnectLink({
        alias: "Store WhatsApp",
        callbackUrl: "https://app.test/callback",
        userId: "tenant_1:store_1",
      }),
    ).resolves.toEqual({
      connectedAccountId: "ca_1",
      expiresAt: "2026-08-07T12:00:00Z",
      redirectUrl: "https://connect.composio.dev/link",
    });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://composio.test/api/v3.1/connected_accounts/link",
    );
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toEqual(
      expect.objectContaining({ "x-api-key": "composio-secret" }),
    );
    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))).toEqual({
      alias: "Store WhatsApp",
      auth_config_id: "ac_whatsapp",
      callback_url: "https://app.test/callback",
      user_id: "tenant_1:store_1",
    });
  });

  it("returns OAuth to the CRM WhatsApp surface by default", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({
        connected_account_id: "ca_1",
        expires_at: "2026-08-07T12:00:00Z",
        redirect_url: "https://connect.composio.dev/link",
      }),
    );
    const provider = createComposioCrmConnectionSetupProvider(
      { ...env, PUBLIC_APP_URL: "https://app.example.test" },
      fetchImpl,
    );

    await provider.createConnectLink({ userId: "tenant_1:store_1" });

    expect(
      JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body)),
    ).toMatchObject({
      callback_url: "https://app.example.test/#/crm?surface=whatsapp",
    });
  });

  it("rejects an authorization redirect outside Composio", async () => {
    const provider = createComposioCrmConnectionSetupProvider(
      env,
      vi.fn<typeof fetch>(async () =>
        Response.json({
          connected_account_id: "ca_1",
          expires_at: "2026-08-07T12:00:00Z",
          redirect_url: "https://attacker.example/collect",
        }),
      ),
    );

    await expect(
      provider.createConnectLink({ userId: "tenant_1:store_1" }),
    ).rejects.toMatchObject({ code: "invalid_provider_response" });
  });

  it("verifies and normalizes connected-account status", async () => {
    const provider = createComposioCrmConnectionSetupProvider(
      env,
      vi.fn<typeof fetch>(async () =>
        Response.json({
          id: "ca_1",
          status: "ACTIVE",
          status_reason: null,
          toolkit: { slug: "whatsapp" },
        }),
      ),
    );

    await expect(provider.verifyConnectedAccount("ca_1")).resolves.toEqual({
      connectedAccountId: "ca_1",
      status: "active",
      statusReason: null,
      toolkit: "whatsapp",
    });
  });

  it("discovers WABAs and phones through typed tool execution", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          data: { data: [{ id: "waba_1", name: "Dealer" }] },
          successful: true,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            phone_numbers: [
              {
                display_phone_number: "+55 11 99999-9999",
                id: "phone_1",
                verified_name: "Dealer Sales",
              },
            ],
          },
          successful: true,
        }),
      );
    const provider = createComposioCrmConnectionSetupProvider(env, fetchImpl);

    await expect(provider.discoverWhatsappResources("ca_1")).resolves.toEqual({
      businessAccounts: [{ id: "waba_1", name: "Dealer" }],
      phones: [
        {
          businessAccountId: "waba_1",
          displayName: "Dealer Sales",
          id: "phone_1",
          phone: "+55 11 99999-9999",
        },
      ],
    });
    const requestBody = JSON.parse(
      String(fetchImpl.mock.calls[1]?.[1]?.body),
    ) as { arguments: unknown };
    expect(requestBody.arguments).toEqual({ business_account_id: "waba_1" });
  });

  it("subscribes the app and sanitizes failed tool output", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ data: {}, successful: true }))
      .mockResolvedValueOnce(
        Response.json({
          error: "composio-secret",
          successful: false,
        }),
      );
    const provider = createComposioCrmConnectionSetupProvider(env, fetchImpl);

    await expect(
      provider.subscribeWhatsappApp({
        businessAccountId: "waba_1",
        connectedAccountId: "ca_1",
      }),
    ).resolves.toEqual({ subscribed: true });
    const failure = provider.subscribeWhatsappApp({
      businessAccountId: "waba_1",
      connectedAccountId: "ca_1",
    });
    await expect(failure).rejects.toMatchObject({
      code: "provider_rejected",
    });
    await expect(failure).rejects.not.toThrow(/composio-secret/u);
  });

  it("times out while reading the provider response body", async () => {
    const provider = createComposioCrmConnectionSetupProvider(
      { ...env, COMPOSIO_REQUEST_TIMEOUT_MS: "5" },
      vi.fn<typeof fetch>(async (_url, init) => {
        const signal = init?.signal;
        return new Response(
          new ReadableStream({
            start(controller) {
              signal?.addEventListener("abort", () =>
                controller.error(new DOMException("Aborted", "AbortError")),
              );
            },
          }),
        );
      }),
    );

    await expect(provider.verifyConnectedAccount("ca_1")).rejects.toMatchObject(
      { code: "timeout" },
    );
  });
});
