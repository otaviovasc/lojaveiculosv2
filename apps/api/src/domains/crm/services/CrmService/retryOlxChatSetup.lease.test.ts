import type { AuditEvent } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import type {
  CrmConnectionCredentialVault,
  OlxCrmWebhookSetupProvider,
} from "../../ports/crmConnectionSetupProvider.js";
import type {
  CrmConnection,
  CrmConnectionRepository,
} from "../../ports/crmConnectionRepository.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmServicePorts } from "./serviceSupport.js";
import { retryOlxChatSetup } from "./retryOlxChatSetup.js";

describe("retryOlxChatSetup lease terminalization", () => {
  it("releases the owner-checked lease and records failure when vault access fails", async () => {
    const repository = createTestCrmConnectionRepository([connection()]);
    const configureChat = vi.fn();
    const audits: AuditEvent[] = [];

    const open: CrmConnectionCredentialVault["open"] = vi.fn(async () => {
      throw new Error("vault unavailable");
    });
    await expect(
      retryOlxChatSetup(
        context({ record: async (event) => void audits.push(event) }),
        { connectionId },
        ports(repository, {
          configureChat,
          open,
        }),
      ),
    ).rejects.toThrow("vault unavailable");

    expect(configureChat).not.toHaveBeenCalled();
    expect(await repository.findConnectionById(connectionId)).toMatchObject({
      metadata: {
        webhookSetup: {
          capabilities: {
            chat: { reason: "runtime_unavailable", status: "error" },
          },
          lastErrorCode: "request_failed",
          leaseExpiresAt: null,
          leaseOwner: null,
          status: "partial",
        },
      },
    });
    expect(retryOutcomes(audits)).toEqual(["attempted", "failed"]);
  });

  it("retries only owner-checked finalization after provider success", async () => {
    const base = createTestCrmConnectionRepository([connection()]);
    const finish = vi.fn(async (input: FinishOlxSetupInput) => {
      const setup = input.metadata.webhookSetup as Record<string, unknown>;
      if (setup.status !== "indeterminate" && finish.mock.calls.length === 2)
        throw new Error("database interrupted");
      return base.finishOlxWebhookSetup?.(input) ?? null;
    });
    const repository = { ...base, finishOlxWebhookSetup: finish };
    const configureChat = vi.fn(async () => ({
      httpStatus: 204,
      providerRequestId: "olx-operation-204",
    }));

    await expect(
      retryOlxChatSetup(
        context(),
        { connectionId },
        ports(repository, { configureChat }),
      ),
    ).resolves.toMatchObject({ setup: { status: "configured" } });

    expect(configureChat).toHaveBeenCalledOnce();
    expect(finish).toHaveBeenCalledTimes(3);
    expect(await base.findConnectionById(connectionId)).toMatchObject({
      metadata: {
        webhookSetup: {
          leaseExpiresAt: null,
          leaseOwner: null,
          status: "configured",
        },
      },
    });
  });

  it("terminalizes a lease when the required attempted audit fails", async () => {
    const repository = createTestCrmConnectionRepository([connection()]);
    const configureChat = vi.fn();
    const logger = testLogger();

    await expect(
      retryOlxChatSetup(
        context(
          {
            record: vi.fn(async () => {
              throw new Error("audit unavailable");
            }),
          },
          logger,
        ),
        { connectionId },
        ports(repository, { configureChat }),
      ),
    ).rejects.toThrow("audit unavailable");

    expect(configureChat).not.toHaveBeenCalled();
    expect(await repository.findConnectionById(connectionId)).toMatchObject({
      metadata: {
        webhookSetup: {
          leaseExpiresAt: null,
          leaseOwner: null,
          status: "partial",
        },
      },
    });
    expect(logger.error).toHaveBeenCalledWith(
      "crm.connection.olx.chat.setup.retry.terminal",
      expect.objectContaining({
        finalizationSucceeded: true,
        outcome: "failed",
        stage: "audit",
      }),
    );
  });

  it("keeps provider success finalized when the terminal audit fails", async () => {
    const repository = createTestCrmConnectionRepository([connection()]);
    const configureChat = vi.fn(async () => ({
      httpStatus: 204,
      providerRequestId: "olx-operation-204",
    }));
    const logger = testLogger();
    const record = vi.fn(async (event: AuditEvent) => {
      if (event.outcome === "succeeded") throw new Error("audit unavailable");
    });

    await expect(
      retryOlxChatSetup(
        context({ record }, logger),
        { connectionId },
        ports(repository, { configureChat }),
      ),
    ).rejects.toThrow("audit unavailable");

    expect(configureChat).toHaveBeenCalledOnce();
    expect(await repository.findConnectionById(connectionId)).toMatchObject({
      metadata: {
        webhookSetup: {
          leaseExpiresAt: null,
          leaseOwner: null,
          status: "configured",
        },
      },
    });
    expect(logger.error).toHaveBeenCalledWith(
      "crm.connection.olx.chat.setup.retry.terminal",
      expect.objectContaining({
        finalizationSucceeded: true,
        providerSucceeded: true,
        stage: "audit",
      }),
    );
  });
});

const connectionId = "olx-connection-lease";

function connection(): CrmConnection {
  return {
    credentialsRef: {
      stored: { accessToken: "sealed-access", webhookSecret: "sealed-webhook" },
    },
    displayName: "OLX Chat",
    externalConnectionId: "olx-account",
    externalInstanceId: null,
    id: connectionId,
    metadata: {
      webhookSetup: {
        capabilities: {
          chat: { status: "error" },
          leads: { status: "active" },
        },
        status: "partial",
      },
    },
    phone: null,
    provider: "olx_chat",
    status: "error",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
    webhookUrl: `https://api.example.test/api/v1/crm/whatsapp/webhooks/olx/${connectionId}/received`,
  };
}

function context(
  audit?: { record: (event: AuditEvent) => Promise<void> },
  logger?: ReturnType<typeof testLogger>,
) {
  return createServiceContext({
    actor: { id: "user-1", kind: "user" },
    ...(audit ? { audit, auditFailureTier: "required" as const } : {}),
    entitlements: ["crm"],
    ...(logger ? { logger } : {}),
    permissions: ["crm.messaging.connection.setup"],
    request: { requestId: "request-1" },
    storeId: "store-1",
    tenantId: "tenant-1",
  });
}

function ports(
  repository: CrmConnectionRepository,
  overrides: {
    configureChat?: OlxCrmWebhookSetupProvider["configureChat"];
    open?: CrmConnectionCredentialVault["open"];
  } = {},
): CrmServicePorts {
  return {
    crmConnectionCredentialVault: {
      open: overrides.open ?? vi.fn(async ({ sealed }) => `opened:${sealed}`),
      seal: vi.fn(),
    },
    crmConnectionRepository: repository,
    crmRepository: {} as never,
    olxCrmCallbackOrigin: "https://api.example.test",
    olxCrmWebhookSetupProvider: {
      configureChat: overrides.configureChat ?? vi.fn(async () => undefined),
      configureLeads: vi.fn(),
    },
  };
}

function retryOutcomes(events: AuditEvent[]) {
  return events
    .filter((event) => event.action === "crm.connection.olx.chat.setup.retry")
    .map((event) => event.outcome);
}

function testLogger() {
  return { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
}

type FinishOlxSetupInput = Parameters<
  NonNullable<CrmConnectionRepository["finishOlxWebhookSetup"]>
>[0];
