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

  it("retries transient registration failures because OLX registration is update-safe", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    const wait = vi.fn(async () => undefined);
    const provider = createOlxCrmWebhookSetupProvider(fetch, wait);

    await expect(
      provider.configureChat({
        accessToken: "access",
        callbackUrl: "https://api.example/chat",
      }),
    ).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(250);
  });

  it("preserves the final OLX HTTP status for safe diagnostics", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const provider = createOlxCrmWebhookSetupProvider(
      fetch,
      async () => undefined,
    );

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

  it("does not wait synchronously when OLX requests a long retry delay", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(null, {
        headers: { "retry-after": "30" },
        status: 429,
      }),
    );
    const wait = vi.fn(async () => undefined);
    const provider = createOlxCrmWebhookSetupProvider(fetch, wait);

    await expect(
      provider.configureChat({
        accessToken: "access",
        callbackUrl: "https://api.example/chat",
      }),
    ).rejects.toMatchObject({
      code: "rate_limited",
      httpStatus: 429,
      retryAfterSeconds: 30,
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(wait).not.toHaveBeenCalled();
  });
});

function requestBody(
  fetch: { mock: { calls: Parameters<typeof globalThis.fetch>[] } },
  index: number,
) {
  return JSON.parse(String(fetch.mock.calls[index]?.[1]?.body)) as unknown;
}
