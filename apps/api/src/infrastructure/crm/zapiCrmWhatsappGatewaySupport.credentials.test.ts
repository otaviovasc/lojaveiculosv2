import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import { createCrmConnectionCredentialVault } from "./crmConnectionCredentialVault.js";
import {
  isZapiProviderConnected,
  resolveZapiCredentials,
  toProviderStatus,
  ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
} from "./zapiCrmWhatsappGatewaySupport.js";

const env = {
  CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY: "test-only-key",
  CRM_ZAPI_CLIENT_TOKEN: "central-client-token",
};

describe("resolveZapiCredentials stored token", () => {
  it("opens a tenant/store-bound encrypted instance token", async () => {
    const connection = createConnection();
    const vault = createCrmConnectionCredentialVault(env);
    const [instanceId, instanceToken] = await Promise.all([
      vault.seal({
        plaintext: "instance-1",
        purpose: ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      }),
      vault.seal({
        plaintext: "instance-secret",
        purpose: ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      }),
    ]);
    connection.credentialsRef = {
      env: { clientToken: "UNTRUSTED_CONNECTION_CLIENT_TOKEN" },
      stored: {
        clientToken: "untrusted-connection-token",
        instanceId,
        instanceToken,
      },
    };

    expect(resolveZapiCredentials(connection, env)).toEqual({
      apiBaseUrl: "https://api.z-api.io",
      clientToken: "central-client-token",
      instanceId: "instance-1",
      instanceToken: "instance-secret",
      requestTimeoutMs: 10_000,
    });
  });

  it("requires the canonical server-owned client token", () => {
    const connection = createConnection();
    connection.credentialsRef = {
      env: {
        apiBaseUrl: "ZAPI_API_BASE_URL",
        clientToken: "LEGACY_CLIENT_TOKEN",
        instanceId: "ZAPI_INSTANCE_ID",
        instanceToken: "ZAPI_INSTANCE_TOKEN",
      },
    };

    expect(() =>
      resolveZapiCredentials(connection, {
        LEGACY_CLIENT_TOKEN: "legacy-secret",
        ZAPI_API_BASE_URL: "https://api.z-api.io",
        ZAPI_INSTANCE_ID: "instance-1",
        ZAPI_INSTANCE_TOKEN: "instance-secret",
      }),
    ).toThrow("central client authentication is not configured");
  });

  it("rejects plaintext stored instance tokens", () => {
    const connection = createConnection();
    connection.credentialsRef = {
      stored: {
        instanceId: "instance-1",
        instanceToken: "plaintext-secret",
      },
    };

    expect(() => resolveZapiCredentials(connection, env)).toThrow(
      "must use encrypted CRM credential storage",
    );
  });
});

describe("Z-API canonical connected predicate", () => {
  it.each([
    [{ connected: true, smartphoneConnected: false }, true],
    [{ connected: false, smartphoneConnected: true }, true],
    [{ connected: false, smartphoneConnected: false }, false],
    [{}, false],
    [{ connected: "true", smartphoneConnected: "true" }, false],
  ])("normalizes status payloads", (payload, expected) => {
    expect(isZapiProviderConnected(payload)).toBe(expected);
    expect(toProviderStatus(payload).providerStatus).toBe(
      expected ? "connected" : "disconnected",
    );
  });
});

function createConnection(): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {},
    displayName: "Z-API",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "active",
    storeId: "store_1" as StoreId,
    tenantId: "tenant_1" as TenantId,
    webhookUrl: null,
  };
}
