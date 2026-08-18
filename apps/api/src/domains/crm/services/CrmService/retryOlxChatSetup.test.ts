import { describe, expect, it, vi } from "vitest";
import type { AuditEvent } from "@lojaveiculosv2/audit";
import type { CrmRoutingConnectionRepository } from "../../ports/crmRoutingConnectionRepository.js";
import type { CrmRoutingPolicyRepository } from "../../ports/crmRoutingPolicyRepository.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import { retryOlxChatSetup } from "./retryOlxChatSetup.js";
import {
  createOlxConnection,
  createRetryOlxChatSetupContext as context,
} from "../../testSupportOlxChatSetupRetry.js";

describe("retryOlxChatSetup", () => {
  it("rejects a second retry after Chat setup is already configured", async () => {
    const repository = createTestCrmConnectionRepository();
    const connection = await createOlxConnection(repository);
    const configureChat = vi.fn(async () => ({
      httpStatus: 201,
      providerRequestId: "olx-request-1",
    }));
    const open = vi.fn(async ({ sealed }: { sealed: string }) => sealed);
    const ports = {
      crmConnectionCredentialVault: { open, seal: vi.fn() },
      crmConnectionRepository: repository,
      crmRepository: {} as never,
      olxCrmCallbackOrigin: "https://api.example.test",
      olxCrmWebhookSetupProvider: {
        configureChat,
        configureLeads: vi.fn(),
      },
    };

    await retryOlxChatSetup(context(), { connectionId: connection.id }, ports);
    configureChat.mockClear();
    open.mockClear();

    await expect(
      retryOlxChatSetup(context(), { connectionId: connection.id }, ports),
    ).rejects.toMatchObject({ reason: "already_configured" });
    expect(open).not.toHaveBeenCalled();
    expect(configureChat).not.toHaveBeenCalled();
  });

  it("retries only Chat with sealed authorization and preserves Leads and Stock", async () => {
    const repository = createTestCrmConnectionRepository();
    const connection = await createOlxConnection(repository);
    const configureChat = vi.fn(
      async (_input: { accessToken: string; callbackUrl: string }) => ({
        httpStatus: 201,
        providerRequestId: "olx-request-1",
      }),
    );
    const configureLeads = vi.fn(async () => undefined);
    const events: AuditEvent[] = [];
    const audit = vi.fn(async (event: AuditEvent) => {
      events.push(event);
    });

    let defaultConnectionId: string | null = null;
    const routingConnectionRepository: CrmRoutingConnectionRepository = {
      listConnections: async () => {
        const canonical = await repository.findConnectionById(connection.id);
        return canonical?.status === "active"
          ? [
              {
                capabilities: {
                  inbound: true,
                  outbound: true,
                  scheduling: false,
                  templates: false,
                },
                channel: "olx_chat",
                connected: true,
                credentialBroker: "direct",
                degraded: false,
                displayName: canonical.displayName,
                errorCode: null,
                id: canonical.id,
                provider: "olx",
                state: "active",
                storeId: canonical.storeId,
                tenantId: canonical.tenantId,
              },
            ]
          : [];
      },
    };
    const routingPolicyRepository: CrmRoutingPolicyRepository = {
      createDefaultIfMissing: async (input) => {
        if (defaultConnectionId) return null;
        defaultConnectionId = input.defaultConnectionId;
        return { ...input, id: "policy-1" };
      },
      listPolicies: async () => [],
      upsertPolicy: async (input) => ({ ...input, id: "policy-1" }),
    };

    const result = await retryOlxChatSetup(
      context({ record: audit }),
      { connectionId: connection.id },
      {
        crmConnectionCredentialVault: {
          open: vi.fn(async ({ sealed }) => `opened:${sealed}`),
          seal: vi.fn(),
        },
        crmConnectionRepository: repository,
        olxCrmCallbackOrigin: "https://api.example.test",
        crmRoutingConnectionRepository: routingConnectionRepository,
        crmRoutingPolicyRepository: routingPolicyRepository,
        crmRepository: {} as never,
        olxCrmWebhookSetupProvider: { configureChat, configureLeads },
      },
    );

    expect(result).toMatchObject({
      channel: "olx_chat",
      diagnostics: {
        httpStatus: 201,
        providerRequestId: "olx-request-1",
        retryable: false,
      },
      provider: "olx",
      readiness: { ready: true },
      setup: { attemptCount: 3, status: "configured" },
    });
    expect(configureChat).toHaveBeenCalledOnce();
    expect(configureLeads).not.toHaveBeenCalled();
    expect(defaultConnectionId).toBe(connection.id);
    const callback = new URL(
      configureChat.mock.calls[0]?.[0].callbackUrl ?? "https://invalid.test",
    );
    expect(callback.searchParams.getAll("token")).toEqual([
      "opened:sealed-webhook",
    ]);
    expect([...callback.searchParams.keys()]).toEqual(["token"]);
    expect(configureChat.mock.calls[0]?.[0].accessToken).toBe(
      "opened:sealed-access",
    );
    const saved = await repository.findConnectionById(connection.id);
    expect(saved).toMatchObject({
      status: "active",
      metadata: {
        webhookSetup: {
          capabilities: {
            chat: { status: "active" },
            leads: { marker: "unchanged", status: "active" },
            stock: { marker: "unchanged", status: "active" },
          },
        },
      },
    });
    await expect(
      routingConnectionRepository.listConnections({
        storeId: "store_1" as never,
        tenantId: "tenant_1" as never,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        channel: "olx_chat",
        connected: true,
        id: connection.id,
        provider: "olx",
      }),
    ]);
    expect(
      events
        .filter(
          (event) => event.action === "crm.connection.olx.chat.setup.retry",
        )
        .map((event) => event.outcome),
    ).toEqual(["attempted", "succeeded"]);
    expect(
      events.find(
        (event) =>
          event.action === "crm.connection.olx.chat.setup.retry" &&
          event.outcome === "succeeded",
      )?.metadata,
    ).toMatchObject({
      finalizationSucceeded: true,
      providerHttpStatus: 201,
      providerRequestId: "olx-request-1",
      providerSucceeded: true,
    });
  });

  it("blocks missing, wrong-scope, and wrong-provider targets", async () => {
    const repository = createTestCrmConnectionRepository();
    const olx = await createOlxConnection(repository);
    const zapi = await repository.createConnection({
      displayName: "Z-API",
      provider: "zapi",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });
    const ports = {
      crmConnectionCredentialVault: { open: vi.fn(), seal: vi.fn() },
      crmConnectionRepository: repository,
      crmRepository: {} as never,
      olxCrmCallbackOrigin: "https://api.example.test",
      olxCrmWebhookSetupProvider: {
        configureChat: vi.fn(),
        configureLeads: vi.fn(),
      },
    };

    await expect(
      retryOlxChatSetup(context(), { connectionId: "missing" }, ports),
    ).rejects.toMatchObject({ reason: "not_found" });
    await expect(
      retryOlxChatSetup(context(), { connectionId: zapi.id }, ports),
    ).rejects.toMatchObject({ reason: "wrong_provider" });
    await expect(
      retryOlxChatSetup(
        context(undefined, "store_2", "tenant_1"),
        { connectionId: olx.id },
        ports,
      ),
    ).rejects.toMatchObject({ reason: "not_found" });
    await expect(
      retryOlxChatSetup(
        context(undefined, "store_1", "tenant_2"),
        { connectionId: olx.id },
        ports,
      ),
    ).rejects.toMatchObject({ reason: "not_found" });
    expect(
      ports.olxCrmWebhookSetupProvider.configureChat,
    ).not.toHaveBeenCalled();
  });
});
