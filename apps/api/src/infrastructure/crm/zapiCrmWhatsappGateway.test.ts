import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
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
    const gateway = createZapiCrmWhatsappGateway(
      {
        CRM_ZAPI_CLIENT_TOKEN: "client-token",
        ZAPI_API_BASE_URL: "https://api.z-api.io",
        ZAPI_INSTANCE_ID: "instance-1",
        ZAPI_INSTANCE_TOKEN: "instance-token",
      },
      fetchImpl,
    );

    await expect(
      gateway.getProfilePhotoUrl?.(connection(), {
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
      {
        CRM_ZAPI_CLIENT_TOKEN: "client-token",
        CRM_ZAPI_API_BASE_URL: "https://api.z-api.io",
        ZAPI_API_BASE_URL: "https://api.z-api.io",
        ZAPI_INSTANCE_ID: "instance-1",
        ZAPI_INSTANCE_TOKEN: "instance-token",
      },
      vi.fn<typeof fetch>(async () => new Response(null, { status: 404 })),
    );

    await expect(
      gateway.getProfilePhotoUrl?.(connection(), { phone: "5511999999999" }),
    ).resolves.toBeNull();
  });
});

function connection(): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {
      env: {
        apiBaseUrl: "ZAPI_API_BASE_URL",
        instanceId: "ZAPI_INSTANCE_ID",
        instanceToken: "ZAPI_INSTANCE_TOKEN",
      },
    },
    displayName: "Z-API",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "active",
    storeId: "store-1" as StoreId,
    tenantId: "tenant-1" as TenantId,
    webhookUrl: null,
  };
}
