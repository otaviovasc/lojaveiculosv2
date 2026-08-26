import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import {
  ZAPI_CLIENT_TOKEN_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import { createCrmConnectionCredentialVault } from "./crmConnectionCredentialVault.js";
import { createZapiCrmWhatsappGateway } from "./zapiCrmWhatsappGateway.js";

describe("Z-API profile photo gateway", () => {
  it("resolves a fresh authenticated contact photo URL", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({ link: "https://pps.whatsapp.net/current.jpg" }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    );
    const gateway = createZapiCrmWhatsappGateway(env, fetchImpl);

    await expect(
      gateway.getProfilePhotoUrl?.(await connection(), {
        phone: "5511999999999",
      }),
    ).resolves.toBe("https://pps.whatsapp.net/current.jpg");
    const [requestUrl, requestInit] = fetchImpl.mock.calls[0] ?? [];
    expect(requestUrl).toBe(
      "https://api.z-api.io/instances/instance-1/token/instance-token/profile-picture?phone=5511999999999",
    );
    expect(requestInit?.method).toBe("GET");
    expect(new Headers(requestInit?.headers).get("Client-Token")).toBe(
      "client-token",
    );
  });

  it("treats a contact without a profile photo as empty", async () => {
    const gateway = createZapiCrmWhatsappGateway(
      env,
      vi.fn<typeof fetch>(async () => new Response(null, { status: 404 })),
    );

    await expect(
      gateway.getProfilePhotoUrl?.(await connection(), {
        phone: "5511999999999",
      }),
    ).resolves.toBeNull();
  });
});

const env = {
  CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY: "zapi-gateway-test-key",
  CRM_ZAPI_API_BASE_URL: "https://api.z-api.io",
};

async function connection(): Promise<CrmConnection> {
  const scope = {
    storeId: "store-1" as StoreId,
    tenantId: "tenant-1" as TenantId,
  };
  const vault = createCrmConnectionCredentialVault(env);
  const [clientToken, instanceId, instanceToken] = await Promise.all([
    vault.seal({
      ...scope,
      plaintext: "client-token",
      purpose: ZAPI_CLIENT_TOKEN_CREDENTIAL_PURPOSE,
    }),
    vault.seal({
      ...scope,
      plaintext: "instance-1",
      purpose: ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
    }),
    vault.seal({
      ...scope,
      plaintext: "instance-token",
      purpose: ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
    }),
  ]);
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {
      mode: "stored",
      stored: { clientToken, instanceId, instanceToken },
    },
    displayName: "Z-API",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "active",
    ...scope,
    webhookUrl: null,
  };
}
