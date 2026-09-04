import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import {
  createServiceContext,
  type StoreScopedServiceContext,
} from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import {
  createZapiWebhookSetupIntent,
  withZapiWebhookSetupState,
} from "../../../domains/crm/whatsapp/zapiWebhookSetupState.js";
import { runZapiWebhookSetupAttempt } from "../../../domains/crm/services/CrmWhatsappService/runZapiWebhookSetupAttempt.js";

describe("runZapiWebhookSetupAttempt", () => {
  it("persists partial provider setup state", async () => {
    const { connection, ports } = fixture({ failedType: "delivery" });

    const result = await runZapiWebhookSetupAttempt(
      context(),
      input(connection.id),
      ports,
    );

    expect(result.setup.status).toBe("partial");
    expect(result.setup.lastErrorCode).toBe("provider_rejected");
  });

  it("configures once and returns the durable configured state on retry", async () => {
    const { connection, configure, ports } = fixture({});

    const first = await runZapiWebhookSetupAttempt(
      context(),
      input(connection.id),
      ports,
    );
    const second = await runZapiWebhookSetupAttempt(
      context(),
      input(connection.id),
      ports,
    );

    expect(first.setup.status).toBe("configured");
    expect(second.setup.status).toBe("configured");
    expect(configure).toHaveBeenCalledTimes(1);
  });

  it("does not expose setup success until strict result audit persists", async () => {
    const { connection, configure, ports } = fixture({});
    const auditFailure = new Error("audit unavailable");

    await expect(
      runZapiWebhookSetupAttempt(
        context({ record: vi.fn(async () => Promise.reject(auditFailure)) }),
        input(connection.id),
        ports,
      ),
    ).rejects.toBe(auditFailure);
    await expect(
      runZapiWebhookSetupAttempt(context(), input(connection.id), ports),
    ).resolves.toMatchObject({ setup: { status: "configured" } });
    expect(configure).toHaveBeenCalledTimes(1);
  });

  it("rejects a guessed cross-tenant connection before provider I/O", async () => {
    const { connection, configure, ports } = fixture({ tenantId: "tenant_b" });

    await expect(
      runZapiWebhookSetupAttempt(context(), input(connection.id), ports),
    ).rejects.toThrow("not found");
    expect(configure).not.toHaveBeenCalled();
  });

  it("claims one provider attempt when setup requests race", async () => {
    let release: (() => void) | undefined;
    const providerGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const connection = zapiConnection("tenant_a");
    const repository = createMemoryCrmConnectionRepository([connection]);
    const configure = vi.fn(
      async (
        _connection,
        setupInput: { webhooks: readonly { type: string; url: string }[] },
      ) => {
        await providerGate;
        return {
          results: setupInput.webhooks.map((webhook) => ({
            error: null,
            ok: true,
            status: 200,
            type: webhook.type,
            url: webhook.url,
            verified: true,
          })),
        };
      },
    );
    const ports = {
      ...fixture({}).ports,
      crmConnectionRepository: repository,
      crmMessagingGateway: { configureWebhooks: configure } as never,
    };

    const first = runZapiWebhookSetupAttempt(
      context(),
      input(connection.id),
      ports,
    );
    await vi.waitFor(() => expect(configure).toHaveBeenCalledTimes(1));
    const concurrent = await runZapiWebhookSetupAttempt(
      context(),
      input(connection.id),
      ports,
    );
    expect(concurrent.setup.status).toBe("configuring");
    expect(configure).toHaveBeenCalledTimes(1);
    release?.();
    await expect(first).resolves.toMatchObject({
      setup: { status: "configured" },
    });
  });

  it("reclaims an expired setup lease", async () => {
    const connection = zapiConnection("tenant_a");
    const setup = createZapiWebhookSetupIntent(connection.id);
    connection.metadata = withZapiWebhookSetupState(connection.metadata, {
      ...setup,
      leaseExpiresAt: "2020-01-01T00:00:00.000Z",
      leaseOwner: "dead-worker",
    });
    const repository = createMemoryCrmConnectionRepository([connection]);
    const { configure, ports: basePorts } = fixture({});

    await runZapiWebhookSetupAttempt(context(), input(connection.id), {
      ...basePorts,
      crmConnectionRepository: repository,
    });

    expect(configure).toHaveBeenCalledTimes(1);
  });
});

function fixture(input: { failedType?: string; tenantId?: string }) {
  const connection = zapiConnection(input.tenantId ?? "tenant_a");
  const repository = createMemoryCrmConnectionRepository([connection]);
  const configure = vi.fn(
    async (
      _connection,
      setupInput: { webhooks: readonly { type: string; url: string }[] },
    ) => ({
      results: setupInput.webhooks.map((webhook) => ({
        error: webhook.type === input.failedType ? "safe provider error" : null,
        ok: webhook.type !== input.failedType,
        status: webhook.type === input.failedType ? 400 : 200,
        type: webhook.type,
        url: webhook.url,
        verified: webhook.type !== input.failedType,
      })),
    }),
  );
  const ports: CrmServicePorts = {
    crmConnectionCredentialVault: {
      open: async ({ sealed }: { sealed: string }) =>
        sealed.replace(/^sealed:/u, ""),
      seal: async ({ plaintext }: { plaintext: string }) =>
        `sealed:${plaintext}`,
    },
    crmConnectionRepository: repository,
    crmRepository: createMemoryCrmRepository(),
    crmMessagingGateway: { configureWebhooks: configure } as never,
  };
  return {
    configure,
    connection,
    ports,
  };
}

function context(audit?: {
  record: () => Promise<void>;
}): StoreScopedServiceContext {
  const base = createServiceContext({
    actor: { id: "support", kind: "user" },
    ...(audit ? { audit } : {}),
    entitlements: ["crm"],
    permissions: [
      "crm.messaging.connection.setup",
      "crm.messaging.connection.setup",
    ],
    request: { requestId: "setup-test" },
    storeId: "store_a",
    tenantId: "tenant_a",
  });
  return {
    ...base,
    entitlements: ["crm"],
    storeId: "store_a",
    tenantId: "tenant_a",
  };
}

function input(connectionId: string) {
  return {
    basePath: "/api/v1/crm",
    canonicalApiOrigin: "https://api.example.com",
    connectionId,
  };
}

function zapiConnection(tenantId: string): CrmConnection {
  const id = "34000000-0000-4000-8000-000000000101";
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: { stored: { webhookSecret: "sealed:webhook-secret" } },
    displayName: "Z-API",
    externalConnectionId: null,
    externalInstanceId: null,
    id,
    metadata: withZapiWebhookSetupState({}, createZapiWebhookSetupIntent(id)),
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId: "store_a" as StoreId,
    tenantId: tenantId as TenantId,
    webhookUrl: null,
  };
}
