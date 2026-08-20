import { describe, expect, it, vi } from "vitest";
import { createZapiCrmConnectionSetupProvider } from "./zapiCrmConnectionSetupProvider.js";

const env = {
  CRM_ZAPI_API_BASE_URL: "https://zapi.test",
  CRM_ZAPI_CLIENT_TOKEN: "central-client-secret",
};
const credentials = {
  instanceId: "instance-1",
  instanceToken: "instance-secret",
};

describe("createZapiCrmConnectionSetupProvider", () => {
  it("uses the local test client token only in local development", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({ connected: true }),
    );
    const provider = createZapiCrmConnectionSetupProvider(
      {
        APP_ENV: "local",
        CRM_ZAPI_API_BASE_URL: "https://zapi.test",
        CRM_ZAPI_TEST_CLIENT_TOKEN: "local-test-client-token",
      },
      fetchImpl,
    );

    await expect(provider.validateStatus(credentials)).resolves.toMatchObject({
      connected: true,
    });
    expect(
      new Headers(fetchImpl.mock.calls[0]?.[1]?.headers).get("Client-Token"),
    ).toBe("local-test-client-token");
    expect(() =>
      createZapiCrmConnectionSetupProvider({
        APP_ENV: "staging",
        CRM_ZAPI_TEST_CLIENT_TOKEN: "local-test-client-token",
      }),
    ).toThrow("Z-API client authentication is not configured");
  });

  it("validates status with central client authentication", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({
        connected: true,
        connectedPhone: "5511999999999",
        smartphoneConnected: true,
      }),
    );
    const provider = createZapiCrmConnectionSetupProvider(env, fetchImpl);

    await expect(provider.validateStatus(credentials)).resolves.toEqual({
      connected: true,
      connectedPhone: "5511999999999",
      smartphoneConnected: true,
    });
    const [requestUrl, requestInit] = fetchImpl.mock.calls[0] ?? [];
    expect(requestUrl).toBe(
      "https://zapi.test/instances/instance-1/token/instance-secret/status",
    );
    expect(requestInit?.method).toBe("GET");
    expect(new Headers(requestInit?.headers).get("Client-Token")).toBe(
      "central-client-secret",
    );
  });

  it("returns QR data without adding persistence or cache state", async () => {
    const provider = createZapiCrmConnectionSetupProvider(
      env,
      vi.fn<typeof fetch>(async () =>
        Response.json({ value: "data:image/png;base64,iVBORw0KGgo=" }),
      ),
    );

    await expect(provider.getQrCode(credentials)).resolves.toEqual({
      dataUri: "data:image/png;base64,iVBORw0KGgo=",
      expiresInSeconds: 20,
    });
  });

  it("normalizes line-wrapped QR bytes returned by Z-API", async () => {
    const provider = createZapiCrmConnectionSetupProvider(
      env,
      vi.fn<typeof fetch>(async () =>
        Response.json({ value: "data:image/png;base64,iVBO\n Rw0KGgo=" }),
      ),
    );

    await expect(provider.getQrCode(credentials)).resolves.toEqual({
      dataUri: "data:image/png;base64,iVBORw0KGgo=",
      expiresInSeconds: 20,
    });
  });

  it("classifies a passkey challenge without exposing its contents", async () => {
    const provider = createZapiCrmConnectionSetupProvider(
      env,
      vi.fn<typeof fetch>(async () =>
        Response.json({
          challenge: {
            challenge: "sensitive-provider-challenge",
            rpId: "whatsapp.com",
            timeout: 600_000,
          },
        }),
      ),
    );

    const result = provider.getQrCode(credentials);
    await expect(result).rejects.toMatchObject({
      code: "pairing_method_required",
    });
    await expect(result).rejects.not.toThrow(/sensitive-provider-challenge/u);
  });

  it("classifies an already-connected QR response", async () => {
    const provider = createZapiCrmConnectionSetupProvider(
      env,
      vi.fn<typeof fetch>(async () => Response.json({ connected: true })),
    );

    await expect(provider.getQrCode(credentials)).rejects.toMatchObject({
      code: "pairing_disconnect_required",
    });
  });

  it("models both phone codes and passkey challenges", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ value: "A1B2C3D4E5" }))
      .mockResolvedValueOnce(
        Response.json({
          challenge: {
            challenge: "challenge-value",
            rpId: "whatsapp.com",
            timeout: 60_000,
          },
        }),
      );
    const provider = createZapiCrmConnectionSetupProvider(env, fetchImpl);

    await expect(
      provider.getPairingCode(credentials, "+55 (11) 99999-9999"),
    ).resolves.toEqual({ code: "A1B2C3D4E5", kind: "code" });
    await expect(
      provider.getPairingCode(credentials, "5511999999999"),
    ).resolves.toEqual({
      challenge: {
        challenge: "challenge-value",
        rpId: "whatsapp.com",
        timeoutMs: 60_000,
      },
      kind: "challenge",
    });
  });

  it("sanitizes provider failures and never includes credentials", async () => {
    const provider = createZapiCrmConnectionSetupProvider(
      env,
      vi.fn<typeof fetch>(async () =>
        Response.json(
          { error: "instance-secret central-client-secret" },
          { status: 401 },
        ),
      ),
    );

    const result = provider.validateStatus(credentials);
    await expect(result).rejects.toMatchObject({
      code: "provider_rejected",
      httpStatus: 401,
    });
    await expect(result).rejects.not.toThrow(/instance-secret/u);
  });

  it("aborts requests at the configured timeout", async () => {
    const provider = createZapiCrmConnectionSetupProvider(
      { ...env, CRM_ZAPI_REQUEST_TIMEOUT_MS: "5" },
      vi.fn<typeof fetch>(
        async (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      ),
    );

    await expect(provider.validateStatus(credentials)).rejects.toMatchObject({
      code: "timeout",
    });
  });
});
