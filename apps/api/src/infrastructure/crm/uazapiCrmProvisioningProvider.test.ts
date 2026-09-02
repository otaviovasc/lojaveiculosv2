import { describe, expect, it, vi } from "vitest";
import { createUazapiCrmProvisioningProvider } from "./uazapiCrmProvisioningProvider.js";

const env = { CRM_UAZAPI_ADMIN_TOKEN: "admin-token-1" };

describe("createUazapiCrmProvisioningProvider", () => {
  it("creates an instance with the admintoken header", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({
        instance: { id: "instance-1", status: "disconnected", token: "tok-1" },
        token: "tok-1",
      }),
    );
    const provider = createUazapiCrmProvisioningProvider(env, fetch);

    const result = await provider.createInstance({
      adminField01: "store-1",
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

  it("falls back to the requested name when the id is absent", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ token: "tok-2" }),
    );
    const provider = createUazapiCrmProvisioningProvider(env, fetch);

    await expect(
      provider.createInstance({ name: "store-1-whatsapp-2" }),
    ).resolves.toEqual({
      baseUrl: "https://free.uazapi.com",
      instanceId: "store-1-whatsapp-2",
      instanceToken: "tok-2",
    });
  });

  it("deletes an instance through the admin endpoint", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ success: true }),
    );
    const provider = createUazapiCrmProvisioningProvider(env, fetch);

    await provider.deleteInstance({
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

  it("fails closed when the admin token is missing", async () => {
    const provider = createUazapiCrmProvisioningProvider({}, vi.fn());

    await expect(
      provider.createInstance({ name: "store-1-whatsapp-1" }),
    ).rejects.toMatchObject({
      code: "configuration_error",
      name: "CrmConnectionSetupProviderError",
    });
    await expect(
      provider.deleteInstance({
        baseUrl: "https://free.uazapi.com",
        instanceId: "instance-1",
      }),
    ).rejects.toMatchObject({ code: "configuration_error" });
  });

  it("rejects HTTP 200 error bodies on admin operations", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ error: true, message: "not allowed" }),
    );
    const provider = createUazapiCrmProvisioningProvider(env, fetch);

    await expect(
      provider.createInstance({ name: "store-1-whatsapp-1" }),
    ).rejects.toMatchObject({ code: "provider_rejected" });
  });
});
