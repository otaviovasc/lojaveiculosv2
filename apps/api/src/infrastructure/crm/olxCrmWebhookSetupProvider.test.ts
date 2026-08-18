import { describe, expect, it, vi } from "vitest";
import { createOlxCrmWebhookSetupProvider } from "./olxCrmWebhookSetupProvider.js";

describe("createOlxCrmWebhookSetupProvider", () => {
  it("uses only the official OLX autoservice registration endpoints", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const provider = createOlxCrmWebhookSetupProvider(fetch);
    await provider.configureLeads({
      accessToken: "access",
      callbackUrl: "https://api.example/lead",
      token: "secret",
    });
    await provider.configureChat({
      accessToken: "access",
      callbackUrl: "https://api.example/chat",
    });
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://apps.olx.com.br/autoservice/v1/lead",
      "https://apps.olx.com.br/autoservice/v1/chat",
    ]);
    expect(
      fetch.mock.calls.every(([, init]) => init?.redirect === "manual"),
    ).toBe(true);
    expect(fetch.mock.calls.every(([, init]) => init?.signal)).toBe(true);
    expect(requestBody(fetch, 0)).toEqual({
      token: "secret",
      url: "https://api.example/lead",
    });
    expect(requestBody(fetch, 1)).toEqual({
      webhook: "https://api.example/chat",
    });
  });

  it("treats the documented Chat 500 activation error as retryable failure", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    const provider = createOlxCrmWebhookSetupProvider(fetch);

    await expect(
      provider.configureChat({
        accessToken: "access",
        callbackUrl: "https://api.example/chat",
      }),
    ).rejects.toMatchObject({
      code: "request_failed",
      httpStatus: 500,
      retryable: true,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("preserves the final OLX HTTP status for safe diagnostics", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const provider = createOlxCrmWebhookSetupProvider(fetch);

    await expect(
      provider.configureChat({
        accessToken: "access",
        callbackUrl: "https://api.example/chat",
      }),
    ).rejects.toMatchObject({
      code: "provider_rejected",
      httpStatus: 401,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it.each([400, 401, 403, 404, 405, 415, 422])(
    "classifies OLX %s as a non-retryable provider rejection",
    async (status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response(null, { status }));
      const provider = createOlxCrmWebhookSetupProvider(fetch);

      await expect(
        provider.configureChat({
          accessToken: "access",
          callbackUrl: "https://api.example/chat",
        }),
      ).rejects.toMatchObject({
        code: "provider_rejected",
        httpStatus: status,
        retryable: false,
      });
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it.each([301, 408, 409, 425, 502])(
    "classifies ambiguous OLX %s responses as indeterminate",
    async (status) => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response(null, { status }));
      const provider = createOlxCrmWebhookSetupProvider(fetch);

      await expect(
        provider.configureChat({
          accessToken: "access",
          callbackUrl: "https://api.example/chat",
        }),
      ).rejects.toMatchObject({
        code: "provider_outcome_indeterminate",
        httpStatus: status,
        retryable: false,
      });
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it("does not repeat a POST whose network outcome is ambiguous", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new TypeError("network interrupted"))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    const provider = createOlxCrmWebhookSetupProvider(fetch);

    await expect(
      provider.configureChat({
        accessToken: "access",
        callbackUrl: "https://api.example/chat",
      }),
    ).rejects.toMatchObject({
      code: "provider_outcome_indeterminate",
      retryable: false,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("classifies a transport timeout after dispatch as indeterminate", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    const provider = createOlxCrmWebhookSetupProvider(fetch);

    await expect(
      provider.configureChat({
        accessToken: "access",
        callbackUrl: "https://api.example/chat",
      }),
    ).rejects.toMatchObject({
      code: "provider_outcome_indeterminate",
      retryable: false,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("keeps safe request ids on the documented Chat 500 failure", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response("token=customer-secret", {
        headers: {
          "x-olx-request-id": "olx-operation-500",
          "x-provider-debug": "unsafe customer payload",
        },
        status: 500,
      }),
    );
    const provider = createOlxCrmWebhookSetupProvider(fetch);

    const error = await provider
      .configureChat({
        accessToken: "access-secret",
        callbackUrl: "https://api.example/chat?token=callback-secret",
      })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      code: "request_failed",
      httpStatus: 500,
      providerRequestId: "olx-operation-500",
      retryable: true,
    });
    expect(String(error)).toContain("temporarily unavailable");
    expect(JSON.stringify(error)).not.toContain("customer-secret");
    expect(JSON.stringify(error)).not.toContain("access-secret");
    expect(JSON.stringify(error)).not.toContain("callback-secret");
    expect(JSON.stringify(error)).not.toContain("unsafe customer payload");
  });

  it("treats OLX 429 as indeterminate without proof it was not processed", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(null, {
        headers: { "retry-after": "30" },
        status: 429,
      }),
    );
    const provider = createOlxCrmWebhookSetupProvider(fetch);

    await expect(
      provider.configureChat({
        accessToken: "access",
        callbackUrl: "https://api.example/chat",
      }),
    ).rejects.toMatchObject({
      code: "provider_outcome_indeterminate",
      httpStatus: 429,
      retryAfterSeconds: 30,
      retryable: false,
    });
    expect(fetch).toHaveBeenCalledOnce();
  });
});

function requestBody(
  fetch: { mock: { calls: Parameters<typeof globalThis.fetch>[] } },
  index: number,
) {
  return JSON.parse(String(fetch.mock.calls[index]?.[1]?.body)) as unknown;
}
