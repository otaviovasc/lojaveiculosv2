import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import {
  UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import { createCrmConnectionCredentialVault } from "./crmConnectionCredentialVault.js";
import { createUazapiCrmWhatsappGateway } from "./uazapiCrmWhatsappGateway.js";

describe("UAZAPI WhatsApp gateway", () => {
  it("sends text with the instance token header and returns the WhatsApp message id", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ messageid: "whatsapp-message-1" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const gateway = createUazapiCrmWhatsappGateway(env, fetchImpl);

    const result = await gateway.sendText(await connection(), {
      phone: "5511999999999",
      replyToMessageId: "quoted-1",
      text: "hello",
    });

    expect(result.externalId).toBe("whatsapp-message-1");
    const [requestUrl, requestInit] = fetchImpl.mock.calls[0] ?? [];
    expect(requestUrl).toBe("https://free.uazapi.com/send/text");
    expect(requestInit?.method).toBe("POST");
    expect(new Headers(requestInit?.headers).get("token")).toBe(
      "instance-token",
    );
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      number: "5511999999999",
      replyid: "quoted-1",
      text: "hello",
    });
  });

  it("never persists the internal provider id as an external id", async () => {
    const gateway = createUazapiCrmWhatsappGateway(
      env,
      vi.fn<typeof fetch>(
        async () =>
          new Response(JSON.stringify({ id: "r0123abcd" }), { status: 200 }),
      ),
    );

    await expect(
      gateway.sendText(await connection(), {
        phone: "5511999999999",
        text: "hello",
      }),
    ).rejects.toMatchObject({ code: "request_failed", status: 502 });
  });

  it("throws on HTTP 200 with an error body (disconnected instance)", async () => {
    const gateway = createUazapiCrmWhatsappGateway(
      env,
      vi.fn<typeof fetch>(
        async () =>
          new Response(
            JSON.stringify({ error: true, message: "Instance disconnected" }),
            { status: 200 },
          ),
      ),
    );

    await expect(
      gateway.sendText(await connection(), {
        phone: "5511999999999",
        text: "hello",
      }),
    ).rejects.toMatchObject({
      code: "provider_rejected",
      message: "UAZAPI send text failed: Instance disconnected",
      status: 502,
    });
  });

  it("redacts the instance token from provider error messages", async () => {
    const gateway = createUazapiCrmWhatsappGateway(
      env,
      vi.fn<typeof fetch>(
        async () =>
          new Response(
            JSON.stringify({
              error: true,
              message: "token instance-token is invalid",
            }),
            { status: 200 },
          ),
      ),
    );

    const failure = await gateway
      .sendText(await connection(), { phone: "5511999999999", text: "hello" })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).not.toContain("instance-token");
    expect((failure as Error).message).toContain("inst…[redacted]");
  });

  it("normalizes a stored per-instance base URL to its origin", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            instance: {
              status: "connected",
              owner: "5511999999999@s.whatsapp.net",
            },
            status: { connected: true, loggedIn: true },
          }),
          { status: 200 },
        ),
    );
    const gateway = createUazapiCrmWhatsappGateway(env, fetchImpl);

    const status = await gateway.getConnectionStatus(
      await connection("https://tenant.uazapi.com/some/path?x=1"),
    );

    expect(status.connected).toBe(true);
    expect(status.connectedPhone).toBe("5511999999999");
    expect(status.smartphoneConnected).toBe(true);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://tenant.uazapi.com/instance/status",
    );
  });

  it("rejects unsupported catalog operations", async () => {
    const gateway = createUazapiCrmWhatsappGateway(env, vi.fn());

    await expect(
      gateway.sendCatalog(await connection(), {
        catalogPhone: "5511999999999",
        phone: "5511888888888",
      }),
    ).rejects.toMatchObject({ name: "CrmMessagingCapabilityError" });
  });

  it("disconnects through the instance endpoint", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({}), { status: 200 }),
    );
    const gateway = createUazapiCrmWhatsappGateway(env, fetchImpl);

    await expect(
      gateway.disconnectConnection(await connection()),
    ).resolves.toEqual({ disconnected: true });
    const [requestUrl, requestInit] = fetchImpl.mock.calls[0] ?? [];
    expect(requestUrl).toBe("https://free.uazapi.com/instance/disconnect");
    expect(requestInit?.method).toBe("POST");
    expect(new Headers(requestInit?.headers).get("token")).toBe(
      "instance-token",
    );
  });
});

const env = {
  CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY: "uazapi-gateway-test-key",
  CRM_UAZAPI_BASE_URL: "https://free.uazapi.com",
};

async function connection(
  baseUrlPlaintext = "https://free.uazapi.com",
): Promise<CrmConnection> {
  const scope = {
    storeId: "store-1" as StoreId,
    tenantId: "tenant-1" as TenantId,
  };
  const vault = createCrmConnectionCredentialVault(env);
  const [baseUrl, instanceId, instanceToken] = await Promise.all([
    vault.seal({
      ...scope,
      plaintext: baseUrlPlaintext,
      purpose: UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
    }),
    vault.seal({
      ...scope,
      plaintext: "instance-1",
      purpose: UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
    }),
    vault.seal({
      ...scope,
      plaintext: "instance-token",
      purpose: UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
    }),
  ]);
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {
      mode: "stored",
      stored: { baseUrl, instanceId, instanceToken },
    },
    displayName: "UAZAPI",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider: "uazapi",
    status: "active",
    ...scope,
    webhookUrl: null,
  };
}
