import { describe, expect, it, vi } from "vitest";
import { createZapiCrmConnectionSetupProvider } from "./zapiCrmConnectionSetupProvider.js";

const env = {
  CRM_ZAPI_API_BASE_URL: "https://zapi.test",
};
const credentials = {
  clientToken: "store-client-secret",
  instanceId: "instance-1",
  instanceToken: "instance-secret",
};

describe("Z-API setup response compatibility", () => {
  const pngDataUri = "data:image/png;base64,iVBORw0KGgo=";

  it.each([
    ["image/png", [137, 80, 78, 71, 13, 10, 26, 10], "image/png"],
    ["image/jpeg", [255, 216, 255, 0, 0, 0, 0, 0, 0], "image/jpeg"],
  ])("accepts binary %s QR responses", async (contentType, bytes, mime) => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () =>
        new Response(new Uint8Array(bytes), {
          headers: { "Content-Type": contentType },
        }),
    );
    const provider = createZapiCrmConnectionSetupProvider(env, fetchImpl);

    const result = await provider.getQrCode(credentials);
    expect(result.dataUri).toMatch(new RegExp(`^data:${mime};base64,`, "u"));
    expect(result.expiresInSeconds).toBe(20);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://zapi.test/instances/instance-1/token/instance-secret/qr-code/image",
    );
    expect(
      new Headers(fetchImpl.mock.calls[0]?.[1]?.headers).get("Accept"),
    ).toContain("image/png");
  });

  it.each([
    [Response.json({ nested: { qr: pngDataUri } })],
    [new Response(pngDataUri)],
    [new Response(JSON.stringify(pngDataUri))],
  ])("accepts JSON, nested, and scalar QR bodies", async (response) => {
    const provider = createZapiCrmConnectionSetupProvider(
      env,
      vi.fn<typeof fetch>(async () => response),
    );

    await expect(provider.getQrCode(credentials)).resolves.toMatchObject({
      dataUri: pngDataUri,
    });
  });

  it.each([
    [new Response(null, { headers: { "Content-Type": "image/png" } })],
    [
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "Content-Type": "image/png" },
      }),
    ],
    [
      new Response(new Uint8Array([71, 73, 70]), {
        headers: { "Content-Type": "image/gif" },
      }),
    ],
  ])("rejects invalid QR bytes", async (response) => {
    const provider = createZapiCrmConnectionSetupProvider(
      env,
      vi.fn<typeof fetch>(async () => response),
    );
    await expect(provider.getQrCode(credentials)).rejects.toMatchObject({
      code: "invalid_provider_response",
    });
  });

  it.each([
    [{ code: "A1B2C3D4E5" }, "A1B2C3D4E5"],
    [{ phoneCode: 1234567890 }, "1234567890"],
    [{ pairingCode: "F6G7H8I9J0" }, "F6G7H8I9J0"],
  ])("accepts phone-code key variants", async (payload, code) => {
    const provider = providerReturning(Response.json(payload));
    await expect(
      provider.getPairingCode(credentials, "5511999999999"),
    ).resolves.toEqual({ code, kind: "code" });
  });

  it.each([
    ["A1B2C3D4E5", "A1B2C3D4E5"],
    [JSON.stringify("F6G7H8I9J0"), "F6G7H8I9J0"],
  ])("accepts scalar phone-code bodies", async (body, code) => {
    const provider = providerReturning(new Response(body));
    await expect(
      provider.getPairingCode(credentials, "5511999999999"),
    ).resolves.toEqual({ code, kind: "code" });
  });

  it.each([
    ["11 99999-9999", "5511999999999"],
    ["5511999999999", "5511999999999"],
    ["+55 (11) 99999-9999", "5511999999999"],
    ["11 3333-4444", "551133334444"],
  ])("sends canonical Brazilian E.164 digits", async (phone, expected) => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({ code: "A1B2C3D4E5" }),
    );
    const provider = createZapiCrmConnectionSetupProvider(env, fetchImpl);
    await provider.getPairingCode(credentials, phone);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      `https://zapi.test/instances/instance-1/token/instance-secret/phone-code/${expected}`,
    );
  });

  it.each(["55", "+1 (415) 555-2671", "0011999999999", "123456789"])(
    "rejects invalid or non-Brazilian phone %j",
    async (phone) => {
      const fetchImpl = vi.fn<typeof fetch>();
      const provider = createZapiCrmConnectionSetupProvider(env, fetchImpl);
      await expect(
        provider.getPairingCode(credentials, phone),
      ).rejects.toMatchObject({ code: "configuration_error" });
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it.each([
    [{ connected: true, smartphoneConnected: false }, true],
    [{ connected: false, smartphoneConnected: true }, true],
    [{ connected: false, smartphoneConnected: false }, false],
    [{ smartphoneConnected: false }, false],
  ])("normalizes the connected-state matrix", async (payload, connected) => {
    const provider = providerReturning(Response.json(payload));
    const result = await provider.validateStatus(credentials);
    expect(result.connected).toBe(connected);
  });

  it.each([{}, { connected: "true" }, { smartphoneConnected: "false" }])(
    "rejects invalid status flags",
    async (payload) => {
      const provider = providerReturning(Response.json(payload));
      await expect(provider.validateStatus(credentials)).rejects.toMatchObject({
        code: "invalid_provider_response",
      });
    },
  );

  it.each([
    Response.json({ value: "provider error without an error key" }),
    new Response("not-a-pairing-code"),
  ])("rejects arbitrary text as pairing evidence", async (response) => {
    const provider = providerReturning(response);
    await expect(
      provider.getPairingCode(credentials, "5511999999999"),
    ).rejects.toMatchObject({ code: "invalid_provider_response" });
  });

  it("blocks QR and phone pairing on smartphoneConnected races", async () => {
    const provider = createZapiCrmConnectionSetupProvider(
      env,
      vi.fn<typeof fetch>(async () =>
        Response.json({ connected: false, smartphoneConnected: true }),
      ),
    );
    await expect(provider.getQrCode(credentials)).rejects.toMatchObject({
      code: "pairing_disconnect_required",
    });
    await expect(
      provider.getPairingCode(credentials, "5511999999999"),
    ).rejects.toMatchObject({ code: "pairing_disconnect_required" });
  });

  it("sanitizes provider errors returned with HTTP success", async () => {
    const provider = providerReturning(
      Response.json({ error: "sensitive provider detail" }),
    );
    const result = provider.getPairingCode(credentials, "5511999999999");
    await expect(result).rejects.toMatchObject({ code: "provider_rejected" });
    await expect(result).rejects.not.toThrow(/sensitive provider detail/u);
  });

  it("rejects an explicit unsuccessful setup envelope", async () => {
    const provider = providerReturning(Response.json({ success: false }));
    await expect(
      provider.getPairingCode(credentials, "5511999999999"),
    ).rejects.toMatchObject({ code: "provider_rejected" });
  });
});

function providerReturning(response: Response) {
  return createZapiCrmConnectionSetupProvider(
    env,
    vi.fn<typeof fetch>(async () => response),
  );
}
