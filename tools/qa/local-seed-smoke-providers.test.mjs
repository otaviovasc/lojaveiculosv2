import { afterEach, describe, expect, it, vi } from "vitest";
import { verifySandboxProviders } from "./local-seed-smoke-providers.mjs";

const providerVariables = [
  "ASAAS_API_KEY",
  "ASAAS_API_URL",
  "CRM_ZAPI_API_BASE_URL",
  "CRM_ZAPI_TEST_CLIENT_TOKEN",
  "CRM_ZAPI_TEST_INSTANCE_ID",
  "CRM_ZAPI_TEST_INSTANCE_TOKEN",
];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  for (const variable of providerVariables) delete process.env[variable];
});

describe("local seed provider verification", () => {
  it("skips providers when only their documented base URLs are configured", async () => {
    vi.stubEnv("ASAAS_API_URL", "https://api-sandbox.asaas.com/v3");
    vi.stubEnv("CRM_ZAPI_API_BASE_URL", "https://api.z-api.io");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifySandboxProviders()).resolves.toEqual({
      asaas: { authenticated: false, checked: false },
      zapi: { checked: false, connected: false },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("checks the Asaas sandbox without mutating it", async () => {
    setAsaasEnvironment();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifySandboxProviders();

    expect(result).toEqual({
      asaas: { authenticated: true, checked: true },
      zapi: { checked: false, connected: false },
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://api-sandbox.asaas.com/v3/customers?limit=1",
    );
    expect(request.method).toBe("GET");
  });

  it("checks the configured shared ZAPI instance read-only", async () => {
    setZapiEnvironment();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ connected: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifySandboxProviders();

    expect(result).toEqual({
      asaas: { authenticated: false, checked: false },
      zapi: { checked: true, connected: true },
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("https://api.z-api.io/instances/");
    expect(String(url)).toContain("/status");
    expect(request.method).toBe("GET");
  });

  it("rejects production or incomplete provider configuration", async () => {
    vi.stubEnv("ASAAS_API_KEY", "sandbox-key");
    vi.stubEnv("ASAAS_API_URL", "https://api.asaas.com/v3");
    await expect(verifySandboxProviders()).rejects.toThrow(
      "only verifies the Asaas sandbox API",
    );

    vi.unstubAllEnvs();
    vi.stubEnv("CRM_ZAPI_TEST_INSTANCE_ID", "instance-id");
    await expect(verifySandboxProviders()).rejects.toThrow(
      "Incomplete sandbox configuration",
    );
  });

  it("does not include provider response bodies in failures", async () => {
    setAsaasEnvironment();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('{"secret":"must-not-leak"}', {
          headers: { "content-type": "application/json" },
          status: 401,
        }),
      ),
    );

    await expect(verifySandboxProviders()).rejects.toThrow(
      "Asaas sandbox verification failed with HTTP 401",
    );
    await expect(verifySandboxProviders()).rejects.not.toThrow("must-not-leak");
  });
});

function setAsaasEnvironment() {
  vi.stubEnv("ASAAS_API_KEY", "sandbox-key");
  vi.stubEnv("ASAAS_API_URL", "https://api-sandbox.asaas.com/v3");
}

function setZapiEnvironment() {
  vi.stubEnv("CRM_ZAPI_API_BASE_URL", "https://api.z-api.io");
  vi.stubEnv("CRM_ZAPI_TEST_CLIENT_TOKEN", "client-token");
  vi.stubEnv("CRM_ZAPI_TEST_INSTANCE_ID", "instance-id");
  vi.stubEnv("CRM_ZAPI_TEST_INSTANCE_TOKEN", "instance-token");
}

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
