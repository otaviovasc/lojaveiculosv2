import type { AuditEvent } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { readRecord } from "../../onboardOlxCrmConnectionSupport.js";
import {
  CrmConnectionSetupProviderError,
  type OlxCrmWebhookSetupProvider,
} from "../../ports/crmConnectionSetupProvider.js";
import type {
  CrmConnection,
  CrmConnectionRepository,
} from "../../ports/crmConnectionRepository.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { retryOlxChatSetup } from "./retryOlxChatSetup.js";
import type { CrmServicePorts } from "./serviceSupport.js";

describe("retryOlxChatSetup finalization failure", () => {
  it("persists a fail-closed attempt marker before provider dispatch", async () => {
    const repository = createTestCrmConnectionRepository([connection()]);
    const configureChat = vi.fn(async () => {
      const persisted = await repository.findConnectionById(connectionId);
      const setup = readRecord(persisted?.metadata.webhookSetup);
      const dispatch = readRecord(setup.dispatch);
      expect(typeof dispatch.attemptId).toBe("string");
      expect(dispatch).toMatchObject({
        idempotencyKey: `olx-chat-webhook:${connectionId}`,
        state: "indeterminate",
      });
      expect(setup.status).toBe("indeterminate");
      throw new CrmConnectionSetupProviderError(
        "OLX webhook registration outcome is indeterminate.",
        "provider_outcome_indeterminate",
        undefined,
        undefined,
        undefined,
        false,
      );
    });

    await expect(
      retryOlxChatSetup(
        context(),
        { connectionId },
        ports(repository, configureChat),
      ),
    ).rejects.toMatchObject({ code: "provider_outcome_indeterminate" });
    expect(configureChat).toHaveBeenCalledOnce();
  });

  it("does not repeat the provider POST after lease expiry and emits safe terminal evidence", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T12:00:00.000Z"));
    const base = createTestCrmConnectionRepository([connection()]);
    const finishOlxWebhookSetup = vi.fn(async (input: FinishOlxSetupInput) => {
      const setup = input.metadata.webhookSetup as Record<string, unknown>;
      if (setup.status === "indeterminate") {
        return base.finishOlxWebhookSetup?.(input) ?? null;
      }
      throw new Error("database unavailable");
    });
    const configureChat = vi.fn(async () => ({
      httpStatus: 204,
      providerRequestId: "olx-operation-204",
    }));
    const audits: AuditEvent[] = [];
    const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() };

    const retry = () =>
      retryOlxChatSetup(
        createServiceContext({
          actor: { id: "user-1", kind: "user" },
          audit: { record: async (event) => void audits.push(event) },
          entitlements: ["crm"],
          logger,
          permissions: ["crm.messaging.connection.setup"],
          request: { requestId: "request-1" },
          storeId: "store-1",
          tenantId: "tenant-1",
        }),
        { connectionId },
        ports({ ...base, finishOlxWebhookSetup }, configureChat),
      );

    await expect(retry()).rejects.toThrow("database unavailable");

    expect(configureChat).toHaveBeenCalledOnce();
    expect(finishOlxWebhookSetup).toHaveBeenCalledTimes(3);
    await expect(base.findConnectionById(connectionId)).resolves.toMatchObject({
      metadata: {
        webhookSetup: {
          dispatch: { state: "indeterminate" },
          status: "indeterminate",
        },
      },
    });
    vi.setSystemTime(new Date("2026-08-18T12:01:01.000Z"));
    await expect(retry()).rejects.toMatchObject({
      code: "provider_outcome_indeterminate",
      retryable: false,
    });
    expect(configureChat).toHaveBeenCalledOnce();
    expect(
      audits
        .filter(
          (event) => event.action === "crm.connection.olx.chat.setup.retry",
        )
        .map((event) => event.outcome),
    ).toEqual(["attempted", "failed"]);
    expect(logger.error).toHaveBeenCalledWith(
      "crm.connection.olx.chat.setup.retry.terminal",
      expect.objectContaining({
        finalizationSucceeded: false,
        providerRequestId: "olx-operation-204",
        providerSucceeded: true,
        stage: "finalization",
      }),
    );
    vi.useRealTimers();
  });
});

function context() {
  return createServiceContext({
    actor: { id: "user-1", kind: "user" },
    entitlements: ["crm"],
    permissions: ["crm.messaging.connection.setup"],
    request: { requestId: "request-1" },
    storeId: "store-1",
    tenantId: "tenant-1",
  });
}

function ports(
  repository: CrmConnectionRepository,
  configureChat: OlxCrmWebhookSetupProvider["configureChat"],
): CrmServicePorts {
  return {
    crmConnectionCredentialVault: {
      open: vi.fn(async ({ sealed }: { sealed: string }) => `opened:${sealed}`),
      seal: vi.fn(),
    },
    crmConnectionRepository: repository,
    crmRepository: {} as never,
    olxCrmCallbackOrigin: "https://api.example.test",
    olxCrmWebhookSetupProvider: {
      configureChat,
      configureLeads: vi.fn(),
    },
  };
}

type FinishOlxSetupInput = Parameters<
  NonNullable<CrmConnectionRepository["finishOlxWebhookSetup"]>
>[0];

const connectionId = "olx-finalization-connection";

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
    status: "active",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
    webhookUrl: `https://api.example.test/api/v1/crm/webhooks/olx/${connectionId}/received`,
  };
}
