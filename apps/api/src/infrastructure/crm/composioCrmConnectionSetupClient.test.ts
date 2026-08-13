import { describe, expect, it, vi } from "vitest";
import {
  createComposioSetupClient,
  executeComposioSetupTool,
} from "./composioCrmConnectionSetupClient.js";

const baseUrl = "https://composio.test";

function clientReturning(body: string) {
  return createComposioSetupClient(
    baseUrl,
    "server-api-key",
    1_000,
    vi.fn<typeof fetch>(async () => new Response(body, { status: 200 })),
  );
}

describe("createComposioSetupClient", () => {
  it.each(["", "  ", "ok", "true", "[]", "{broken"])(
    "rejects malformed successful responses (%j)",
    async (body) => {
      await expect(
        clientReturning(body).request("/setup"),
      ).rejects.toMatchObject({ code: "invalid_provider_response" });
    },
  );

  it("keeps HTTP rejection authoritative when its body is malformed", async () => {
    const client = createComposioSetupClient(
      baseUrl,
      "server-api-key",
      1_000,
      vi.fn<typeof fetch>(
        async () => new Response("not-json", { status: 502 }),
      ),
    );

    await expect(client.request("/setup")).rejects.toMatchObject({
      code: "provider_rejected",
      httpStatus: 502,
    });
  });
});

describe("executeComposioSetupTool", () => {
  it.each([
    [{}, "invalid_provider_response"],
    [{ successful: true }, "invalid_provider_response"],
    [{ data: {}, successful: false }, "provider_rejected"],
  ] as const)("fails closed for tool envelope %j", async (payload, code) => {
    const client = { request: vi.fn(async () => payload) };

    await expect(
      executeComposioSetupTool(client, "ca_1", "WHATSAPP_SETUP", {}, "v1"),
    ).rejects.toMatchObject({ code });
  });

  it("accepts only explicit success with a result field", async () => {
    const client = {
      request: vi.fn(async () => ({ data: {}, successful: true })),
    };

    await expect(
      executeComposioSetupTool(client, "ca_1", "WHATSAPP_SETUP", {}, "v1"),
    ).resolves.toEqual({});
  });
});
