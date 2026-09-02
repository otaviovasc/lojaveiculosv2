import { describe, expect, it, vi } from "vitest";
import { createUazapiCrmConnectionSetupProvider } from "./uazapiCrmConnectionSetupProvider.js";

const QR_PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAA=";

const credentials = {
  apiBaseUrl: "https://free.uazapi.com",
  instanceId: "instance-1",
  instanceToken: "instance-token-1",
};

const env = { CRM_UAZAPI_REQUEST_TIMEOUT_MS: "30000" };

describe("createUazapiCrmConnectionSetupProvider", () => {
  it("returns the QR data URI from the connect response", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({
        connected: false,
        instance: { qrcode: QR_PNG_DATA_URI, status: "connecting" },
      }),
    );
    const provider = createUazapiCrmConnectionSetupProvider(env, fetch);

    const result = await provider.getQrCode(credentials);

    expect(result).toEqual({
      dataUri: expect.stringMatching(/^data:image\/png;base64,/) as string,
      expiresInSeconds: 60,
    });
    const [requestUrl, requestInit] = fetch.mock.calls[0] ?? [];
    expect(requestUrl).toBe("https://free.uazapi.com/instance/connect");
    expect(requestInit?.method).toBe("POST");
    expect(new Headers(requestInit?.headers).get("token")).toBe(
      "instance-token-1",
    );
    expect(JSON.parse(String(requestInit?.body))).toEqual({});
  });

  it("falls back to the instance status when connect returns no QR", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementation(async (_request, init) =>
        init?.method === "GET"
          ? Response.json({
              instance: { qrcode: QR_PNG_DATA_URI, status: "connecting" },
              status: { connected: false, loggedIn: false },
            })
          : Response.json({
              connected: false,
              instance: { status: "connecting" },
            }),
      );
    const provider = createUazapiCrmConnectionSetupProvider(env, fetch);

    const result = await provider.getQrCode(credentials);

    expect(result.expiresInSeconds).toBe(60);
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      "https://free.uazapi.com/instance/connect",
      "https://free.uazapi.com/instance/status",
    ]);
  });

  it("returns a pairing code with kind code", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({
        instance: { paircode: "ABCD-1234", status: "connecting" },
      }),
    );
    const provider = createUazapiCrmConnectionSetupProvider(env, fetch);

    const result = await provider.getPairingCode(credentials, "11999998888");

    expect(result).toEqual({ code: "ABCD-1234", kind: "code" });
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      phone: "5511999998888",
    });
  });

  it("maps the status payload to the setup status shape", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({
        instance: {
          owner: "5511999999999@s.whatsapp.net",
          status: "connected",
        },
        status: {
          connected: true,
          jid: { user: "5511999999999" },
          loggedIn: true,
        },
      }),
    );
    const provider = createUazapiCrmConnectionSetupProvider(env, fetch);

    await expect(provider.validateStatus(credentials)).resolves.toEqual({
      connected: true,
      connectedPhone: "5511999999999",
      smartphoneConnected: true,
    });
  });

  it("rejects HTTP 200 error bodies during setup", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({
        code: 401,
        error: true,
        message: "Invalid token instance-token-1.",
      }),
    );
    const provider = createUazapiCrmConnectionSetupProvider(env, fetch);

    const failure = await provider
      .validateStatus(credentials)
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({
      code: "provider_rejected",
      name: "CrmConnectionSetupProviderError",
    });
    expect((failure as Error).message).not.toContain("instance-token-1");
  });

  it("fails closed when the pairing phone is not Brazilian", async () => {
    const provider = createUazapiCrmConnectionSetupProvider(env, vi.fn());

    await expect(
      provider.getPairingCode(credentials, "+14155552671"),
    ).rejects.toMatchObject({
      code: "configuration_error",
      name: "CrmConnectionSetupProviderError",
    });
  });
});
