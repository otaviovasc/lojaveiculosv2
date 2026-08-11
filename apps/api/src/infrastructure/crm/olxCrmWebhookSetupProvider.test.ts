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
      fetch.mock.calls.every(([, init]) => init?.redirect === "error"),
    ).toBe(true);
    expect(requestBody(fetch, 0)).toEqual({
      token: "secret",
      url: "https://api.example/lead",
    });
    expect(requestBody(fetch, 1)).toEqual({
      webhook: "https://api.example/chat",
    });
  });
});

function requestBody(
  fetch: { mock: { calls: Parameters<typeof globalThis.fetch>[] } },
  index: number,
) {
  return JSON.parse(String(fetch.mock.calls[index]?.[1]?.body)) as unknown;
}
