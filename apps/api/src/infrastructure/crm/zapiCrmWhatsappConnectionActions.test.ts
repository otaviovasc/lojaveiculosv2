import { describe, expect, it, vi } from "vitest";
import { disconnectZapiConnection } from "./zapiCrmWhatsappConnectionActions.js";

const credentials = {
  apiBaseUrl: "https://zapi.test",
  clientToken: "client-secret",
  instanceId: "instance-1",
  instanceToken: "instance-secret",
};

describe("disconnectZapiConnection", () => {
  it("uses the official endpoint and requires the provider acknowledgement", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({ value: true }),
    );

    await expect(
      disconnectZapiConnection(credentials, fetchImpl),
    ).resolves.toEqual({ disconnected: true });

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(
      "https://zapi.test/instances/instance-1/token/instance-secret/disconnect",
    );
    expect(init?.method).toBe("GET");
    expect(init?.redirect).toBe("manual");
    expect(new Headers(init?.headers).get("Client-Token")).toBe(
      "client-secret",
    );
  });

  it("rejects a successful HTTP response without value true", async () => {
    const result = disconnectZapiConnection(
      credentials,
      vi.fn<typeof fetch>(async () => Response.json({ value: false })),
    );

    await expect(result).rejects.toMatchObject({
      code: "provider_rejected",
      message: "ZAPI did not confirm the WhatsApp disconnection",
    });
  });

  it("does not expose credentials in provider rejection errors", async () => {
    const result = disconnectZapiConnection(
      credentials,
      vi.fn<typeof fetch>(async () =>
        Response.json(
          { error: "instance-secret client-secret" },
          { status: 401 },
        ),
      ),
    );

    await expect(result).rejects.toMatchObject({ code: "provider_rejected" });
    await expect(result).rejects.not.toThrow(/instance-secret|client-secret/u);
  });
});
