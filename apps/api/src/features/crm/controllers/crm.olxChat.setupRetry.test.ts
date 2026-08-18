import { describe, expect, it, vi } from "vitest";
import { CrmConnectionSetupProviderError } from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createTestCrmConnectionRepository } from "../../../domains/crm/testSupportConnections.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

describe("OLX Chat setup retry route", () => {
  it("exposes the canonical route and typed success diagnostics", async () => {
    const configureChat = vi.fn(async () => ({
      httpStatus: 204,
      providerRequestId: "olx-operation-204",
    }));
    const app = createTestApp({
      crmConnectionCredentialVault: vault(),
      crmConnectionRepository: createTestCrmConnectionRepository([
        connection(),
      ]),
      olxCrmWebhookSetupProvider: {
        configureChat,
        configureLeads: vi.fn(),
      },
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/olx-chat/setup/retry`,
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      channel: "olx_chat",
      connectionId,
      diagnostics: {
        httpStatus: 204,
        providerRequestId: "olx-operation-204",
        retryable: false,
      },
      provider: "olx",
      readiness: { ready: true },
      setup: { attemptCount: 2, status: "configured" },
    });
    expect(configureChat).toHaveBeenCalledOnce();
  });

  it("returns sanitized provider diagnostics in the standard API error envelope", async () => {
    const app = createTestApp({
      crmConnectionCredentialVault: vault(),
      crmConnectionRepository: createTestCrmConnectionRepository([
        connection(),
      ]),
      olxCrmWebhookSetupProvider: {
        configureChat: vi.fn(async () => {
          throw new CrmConnectionSetupProviderError(
            "OLX webhook registration is temporarily unavailable.",
            "request_failed",
            500,
            undefined,
            "olx-operation-500",
            true,
          );
        }),
        configureLeads: vi.fn(),
      },
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/olx-chat/setup/retry`,
      { method: "POST" },
    );
    const body: unknown = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({
      code: "CRM_CONNECTION_SETUP_REQUEST_FAILED",
      details: {
        providerHttpStatus: 500,
        providerRequestId: "olx-operation-500",
        retryable: true,
      },
    });
    expect(JSON.stringify(body)).not.toContain("sealed-access");
    expect(JSON.stringify(body)).not.toContain("sealed-webhook");
  });

  it("returns a dedicated conflict when Chat is already configured", async () => {
    const configureChat = vi.fn();
    const app = createTestApp({
      crmConnectionCredentialVault: vault(),
      crmConnectionRepository: createTestCrmConnectionRepository([
        connection({
          capabilities: { chat: { status: "active" } },
          status: "configured",
        }),
      ]),
      olxCrmWebhookSetupProvider: {
        configureChat,
        configureLeads: vi.fn(),
      },
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/olx-chat/setup/retry`,
      { method: "POST" },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_OLX_CHAT_SETUP_ALREADY_CONFIGURED",
    });
    expect(configureChat).not.toHaveBeenCalled();
  });

  it("blocks retry while the provider outcome is indeterminate", async () => {
    const configureChat = vi.fn();
    const app = createTestApp({
      crmConnectionCredentialVault: vault(),
      crmConnectionRepository: createTestCrmConnectionRepository([
        connection({
          capabilities: { chat: { status: "error" } },
          lastErrorCode: "provider_outcome_indeterminate",
          status: "indeterminate",
        }),
      ]),
      olxCrmWebhookSetupProvider: {
        configureChat,
        configureLeads: vi.fn(),
      },
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/olx-chat/setup/retry`,
      { method: "POST" },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_CONNECTION_SETUP_PROVIDER_OUTCOME_INDETERMINATE",
      details: { retryable: false },
    });
    expect(configureChat).not.toHaveBeenCalled();
  });
});

const connectionId = "26000000-0000-4000-8000-000000000001";

function connection(
  webhookSetup: Record<string, unknown> = {
    attemptCount: 1,
    capabilities: {
      chat: { status: "error" },
      leads: { status: "active" },
    },
    status: "partial",
  },
): CrmConnection {
  return {
    credentialsRef: {
      stored: {
        accessToken: "sealed-access",
        webhookSecret: "sealed-webhook",
      },
    },
    displayName: "OLX Chat",
    externalConnectionId: "olx-account",
    externalInstanceId: null,
    id: connectionId,
    metadata: { webhookSetup },
    phone: null,
    provider: "olx_chat",
    status: "active",
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
    webhookUrl: `https://api.example.test/api/v1/crm/whatsapp/webhooks/olx/${connectionId}/received`,
  };
}

function vault() {
  return {
    open: vi.fn(async ({ sealed }: { sealed: string }) => `opened:${sealed}`),
    seal: vi.fn(),
  };
}
