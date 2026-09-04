import { describe, expect, it, vi } from "vitest";
import { createUazapiCrmProvisioningProvider } from "./uazapiCrmProvisioningProvider.js";

const adminToken = "admin-token-1";

describe("createUazapiCrmProvisioningProvider", () => {
  it("creates an instance with the caller-supplied admintoken header", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({
        instance: { id: "instance-1", status: "disconnected", token: "tok-1" },
        token: "tok-1",
      }),
    );
    const provider = createUazapiCrmProvisioningProvider({}, fetch);

    const result = await provider.createInstance({
      adminField01: "store-1",
      adminToken,
      name: "store-1-whatsapp-1",
    });

    expect(result).toEqual({
      baseUrl: "https://free.uazapi.com",
      instanceId: "instance-1",
      instanceToken: "tok-1",
    });
    const [requestUrl, requestInit] = fetch.mock.calls[0] ?? [];
    expect(requestUrl).toBe("https://free.uazapi.com/instance/create");
    expect(new Headers(requestInit?.headers).get("admintoken")).toBe(
      "admin-token-1",
    );
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      adminField01: "store-1",
      name: "store-1-whatsapp-1",
    });
  });

  it("prefers the caller-supplied baseUrl over the env fallback", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ token: "tok-2" }),
    );
    const provider = createUazapiCrmProvisioningProvider(
      { CRM_UAZAPI_BASE_URL: "https://env.uazapi.com" },
      fetch,
    );

    await expect(
      provider.createInstance({
        adminToken,
        baseUrl: "https://tenant.uazapi.com/path",
        name: "store-1-whatsapp-2",
      }),
    ).resolves.toEqual({
      baseUrl: "https://tenant.uazapi.com",
      instanceId: "store-1-whatsapp-2",
      instanceToken: "tok-2",
    });
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://tenant.uazapi.com/instance/create",
    );
  });

  it("deletes an instance through the admin endpoint", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ success: true }),
    );
    const provider = createUazapiCrmProvisioningProvider({}, fetch);

    await provider.deleteInstance({
      adminToken,
      baseUrl: "https://tenant.uazapi.com/path",
      instanceId: "instance-1",
    });

    const [requestUrl, requestInit] = fetch.mock.calls[0] ?? [];
    expect(requestUrl).toBe("https://tenant.uazapi.com/instance");
    expect(requestInit?.method).toBe("DELETE");
    expect(new Headers(requestInit?.headers).get("admintoken")).toBe(
      "admin-token-1",
    );
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      id: "instance-1",
    });
  });

  it("fails closed without any env-configured admin token", async () => {
    const provider = createUazapiCrmProvisioningProvider({}, vi.fn());

    await expect(
      provider.createInstance({ adminToken: " ", name: "store-1-whatsapp-1" }),
    ).rejects.toMatchObject({
      code: "configuration_error",
      name: "CrmConnectionSetupProviderError",
    });
  });

  it("lists instances and strips the JID from the owner phone", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json([
        {
          id: "instance-1",
          name: "Loja A",
          owner: "5511999990000@s.whatsapp.net",
          status: "connected",
          token: "tok-1",
        },
        {
          id: "instance-2",
          name: "Loja B",
          status: "disconnected",
          token: "tok-2",
        },
      ]),
    );
    const provider = createUazapiCrmProvisioningProvider({}, fetch);

    const instances = await provider.listInstances({ adminToken });

    expect(instances).toEqual([
      {
        connectedPhone: "5511999990000",
        id: "instance-1",
        name: "Loja A",
        status: "connected",
        token: "tok-1",
      },
      {
        connectedPhone: null,
        id: "instance-2",
        name: "Loja B",
        status: "disconnected",
        token: "tok-2",
      },
    ]);
    const [requestUrl, requestInit] = fetch.mock.calls[0] ?? [];
    expect(requestUrl).toBe("https://free.uazapi.com/instance/all");
    expect(requestInit?.method).toBe("GET");
    expect(new Headers(requestInit?.headers).get("admintoken")).toBe(
      "admin-token-1",
    );
  });

  it("rejects HTTP 200 error bodies on admin operations", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ error: true, message: "not allowed" }),
    );
    const provider = createUazapiCrmProvisioningProvider({}, fetch);

    await expect(
      provider.createInstance({ adminToken, name: "store-1-whatsapp-1" }),
    ).rejects.toMatchObject({ code: "provider_rejected" });
  });

  it("redacts the admin token from provider error messages", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ error: true, message: "token admin-token-1 is invalid" }),
    );
    const provider = createUazapiCrmProvisioningProvider({}, fetch);

    const failure = await provider
      .listInstances({ adminToken })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).not.toContain("admin-token-1");
    expect((failure as Error).message).toContain("admi…[redacted]");
  });
});
