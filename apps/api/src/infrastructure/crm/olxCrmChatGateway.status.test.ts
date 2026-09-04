import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import { OLX_ACCESS_TOKEN_CREDENTIAL_PURPOSE } from "../../domains/crm/ports/crmOlxCredentials.js";
import { jsonResponse } from "../marketplace/httpMarketplaceProviderGatewayTestSupport.js";
import { createCrmConnectionCredentialVault } from "./crmConnectionCredentialVault.js";
import { createOlxCrmChatGateway } from "./olxCrmChatGateway.js";

const env = { CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY: "test-only-key" };
let sealedAccessToken: string;

beforeAll(async () => {
  sealedAccessToken = await createCrmConnectionCredentialVault(env).seal({
    plaintext: "access-secret",
    purpose: OLX_ACCESS_TOKEN_CREDENTIAL_PURPOSE,
    storeId: "store_1" as StoreId,
    tenantId: "tenant_1" as TenantId,
  });
});

describe("OLX CRM chat connection status", () => {
  it("reports connected only after OLX validates the access token", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({ user_email: "seller@example.test" }),
    );

    await expect(
      createOlxCrmChatGateway(env, fetchImpl).getConnectionStatus(connection()),
    ).resolves.toMatchObject({
      connected: true,
      connectedPhone: null,
      providerStatus: "connected",
      smartphoneConnected: null,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://apps.olx.com.br/oauth_api/basic_user_info",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("reports a revoked OLX access token as disconnected", async () => {
    const gateway = createOlxCrmChatGateway(
      env,
      vi.fn<typeof fetch>(async () => jsonResponse({}, 401)),
    );

    await expect(
      gateway.getConnectionStatus(connection()),
    ).resolves.toMatchObject({
      connected: false,
      providerStatus: "disconnected",
    });
  });

  it("reports unknown when OLX cannot verify a configured token", async () => {
    const gateway = createOlxCrmChatGateway(
      env,
      vi.fn<typeof fetch>(async () => jsonResponse({}, 503)),
    );

    await expect(
      gateway.getConnectionStatus(connection()),
    ).resolves.toMatchObject({ connected: false, providerStatus: "unknown" });
  });

  it("does not call OLX when local Chat capability is blocked", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const blocked = connection();
    blocked.metadata = {
      webhookSetup: {
        capabilities: {
          chat: { status: "blocked" },
          leads: { status: "active" },
        },
        status: "partial",
      },
    };

    await expect(
      createOlxCrmChatGateway(env, fetchImpl).getConnectionStatus(blocked),
    ).resolves.toMatchObject({
      connected: false,
      providerStatus: "disconnected",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

function connection(): CrmConnection {
  return {
    broker: "direct",
    channel: "olx_chat",
    credentialsRef: { stored: { accessToken: sealedAccessToken } },
    displayName: "OLX",
    externalConnectionId: "olx-account",
    externalInstanceId: null,
    id: "25000000-0000-4000-8000-000000000102",
    metadata: {
      webhookSetup: {
        capabilities: { chat: { status: "active" } },
        status: "configured",
      },
    },
    phone: null,
    provider: "olx",
    status: "active",
    storeId: "store_1" as StoreId,
    tenantId: "tenant_1" as TenantId,
    webhookUrl: null,
  };
}
