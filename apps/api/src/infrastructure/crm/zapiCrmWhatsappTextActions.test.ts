import { describe, expect, it, vi } from "vitest";
import { CrmWhatsappGatewayError } from "../../domains/crm/ports/crmWhatsappGateway.js";
import { sendZapiText } from "./zapiCrmWhatsappTextActions.js";
import type { ZapiCredentials } from "./zapiCrmWhatsappGatewaySupport.js";

const credentials: ZapiCredentials = {
  apiBaseUrl: "https://api.z-api.io",
  clientToken: "client-token-1",
  instanceId: "instance-1",
  instanceToken: "instance-token-1",
};

const input = {
  phone: "5511999999999",
  text: "Ola",
};

describe("sendZapiText rate limit handling", () => {
  it("retries an explicit 429 and honors Retry-After", async () => {
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

    const result = await sendZapiText(credentials, fetchImpl, input, {
      random: () => 0,
      sleep,
    });

    expect(result.externalId).toBe("message-after-retry");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it("returns typed rate-limit metadata after the bounded budget", async () => {
    const fetchImpl = vi.fn<typeof globalThis.fetch>().mockImplementation(
      async () =>
        new Response("Too many requests", {
          headers: { "Retry-After": "3" },
          status: 429,
        }),
    );
    const sleep = vi.fn(async () => undefined);

    const error = await sendZapiText(credentials, fetchImpl, input, {
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

  it("does not retry ambiguous 5xx responses", async () => {
    const fetchImpl = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("Gateway failure", { status: 500 }));
    const sleep = vi.fn(async () => undefined);

    const error = await sendZapiText(credentials, fetchImpl, input, {
      sleep,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CrmWhatsappGatewayError);
    expect(error).toMatchObject({ status: 502 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
