import { describe, expect, it, vi } from "vitest";
import { CrmWhatsappGatewayError } from "../../domains/crm/ports/crmWhatsappGateway.js";
import { sendZapiMedia } from "./zapiCrmWhatsappMediaActions.js";
import type { ZapiCredentials } from "./zapiCrmWhatsappGatewaySupport.js";

const credentials: ZapiCredentials = {
  apiBaseUrl: "https://api.z-api.io",
  clientToken: "client-token-1",
  instanceId: "instance-1",
  instanceToken: "instance-token-1",
};

const imageInput = {
  caption: "Foto do veiculo",
  mediaType: "image" as const,
  mediaUrl: "https://cdn.example.test/vehicle.jpg",
  phone: "5511999999999",
};

describe("sendZapiMedia rate limit handling", () => {
  it("retries HTTP 429 using Retry-After before returning success", async () => {
    const fetchImpl = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response("Too many requests", {
          headers: { "Retry-After": "2" },
          status: 429,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ messageId: "message-after-retry" }), {
          status: 200,
        }),
      );
    const sleep = vi.fn(async () => undefined);

    const result = await sendZapiMedia(credentials, fetchImpl, imageInput, {
      random: () => 0,
      sleep,
    });

    expect(result.externalId).toBe("message-after-retry");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it("returns a typed 429 after the bounded retry budget is exhausted", async () => {
    const fetchImpl = vi.fn<typeof globalThis.fetch>().mockImplementation(
      async () =>
        new Response("Too many requests", {
          headers: { "Retry-After": "3" },
          status: 429,
        }),
    );
    const sleep = vi.fn(async () => undefined);

    const error = await sendZapiMedia(credentials, fetchImpl, imageInput, {
      random: () => 0,
      sleep,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CrmWhatsappGatewayError);
    expect(error).toMatchObject({
      retryAfterSeconds: 3,
      status: 429,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("does not retry ambiguous HTTP 5xx failures", async () => {
    const fetchImpl = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("Gateway failure", { status: 500 }));
    const sleep = vi.fn(async () => undefined);

    const error = await sendZapiMedia(credentials, fetchImpl, imageInput, {
      sleep,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CrmWhatsappGatewayError);
    expect(error).toMatchObject({ status: 502 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
