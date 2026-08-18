import type { AuditEvent } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { CrmConnectionSetupProviderError } from "../../ports/crmConnectionSetupProvider.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import { retryOlxChatSetup } from "./retryOlxChatSetup.js";
import { createFailedOlxConnection } from "../../testSupportOlxChatSetupRetry.js";

describe("retryOlxChatSetup failure persistence", () => {
  it("persists an indeterminate transport outcome and blocks a second provider POST", async () => {
    const target = createFailedOlxConnection();
    const repository = createTestCrmConnectionRepository([target]);
    const configureChat = vi
      .fn()
      .mockRejectedValueOnce(
        new CrmConnectionSetupProviderError(
          "OLX webhook registration outcome is indeterminate.",
          "provider_outcome_indeterminate",
          undefined,
          undefined,
          undefined,
          false,
        ),
      )
      .mockResolvedValueOnce({
        httpStatus: 201,
        providerRequestId: "must-not-dispatch",
      });
    const ports = {
      crmConnectionCredentialVault: {
        open: vi.fn(async ({ sealed }: { sealed: string }) => sealed),
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
    const retry = () =>
      retryOlxChatSetup(
        createServiceContext({
          actor: { id: "user-1", kind: "user" },
          entitlements: ["crm"],
          permissions: ["crm.messaging.connection.setup"],
          request: { requestId: "request-1" },
          storeId: "store-1",
          tenantId: "tenant-1",
        }),
        { connectionId: target.id },
        ports,
      );
    await expect(retry()).rejects.toMatchObject({
      code: "provider_outcome_indeterminate",
      retryable: false,
    });
    expect(configureChat).toHaveBeenCalledOnce();
    await expect(
      repository.findConnectionById(target.id),
    ).resolves.toMatchObject({
      metadata: {
        webhookSetup: {
          failures: {
            chat: {
              code: "provider_outcome_indeterminate",
              retryable: false,
            },
          },
          lastErrorCode: "provider_outcome_indeterminate",
          status: "indeterminate",
        },
      },
    });
    await expect(retry()).rejects.toMatchObject({
      code: "provider_outcome_indeterminate",
      retryable: false,
    });
    expect(configureChat).toHaveBeenCalledOnce();
  });

  it("persists an indeterminate 5xx and performs zero POSTs on a second invocation", async () => {
    const target = createFailedOlxConnection();
    const repository = createTestCrmConnectionRepository([target]);
    const audits: AuditEvent[] = [];
    const context = createServiceContext({
      actor: { id: "user-1", kind: "user" },
      audit: { record: async (event) => void audits.push(event) },
      entitlements: ["crm"],
      permissions: ["crm.messaging.connection.setup"],
      request: { requestId: "request-1" },
      storeId: "store-1",
      tenantId: "tenant-1",
    });
    const configureChat = vi
      .fn()
      .mockRejectedValueOnce(
        new CrmConnectionSetupProviderError(
          "OLX webhook registration outcome is indeterminate.",
          "provider_outcome_indeterminate",
          500,
          undefined,
          "olx-operation-500",
          false,
        ),
      )
      .mockResolvedValueOnce({
        httpStatus: 201,
        providerRequestId: "must-not-dispatch",
      });
    const retry = () =>
      retryOlxChatSetup(
        context,
        { connectionId: target.id },
        {
          crmConnectionCredentialVault: {
            open: vi.fn(async ({ sealed }: { sealed: string }) => sealed),
            seal: vi.fn(),
          },
          crmConnectionRepository: repository,
          crmRepository: {} as never,
          olxCrmCallbackOrigin: "https://api.example.test",
          crmRoutingConnectionRepository: {
            listConnections: vi.fn(async () => []),
          },
          crmRoutingPolicyRepository: {
            createDefaultIfMissing: vi.fn(),
            listPolicies: vi.fn(async () => []),
            upsertPolicy: vi.fn(),
          },
          olxCrmWebhookSetupProvider: {
            configureChat,
            configureLeads: vi.fn(),
          },
        },
      );
    await expect(retry()).rejects.toMatchObject({
      code: "provider_outcome_indeterminate",
      httpStatus: 500,
      providerRequestId: "olx-operation-500",
      retryable: false,
    });

    const saved = await repository.findConnectionById(target.id);
    expect(saved).toMatchObject({
      metadata: {
        webhookSetup: {
          capabilities: {
            chat: { reason: "runtime_unavailable", status: "error" },
            leads: { marker: "unchanged", status: "active" },
            stock: { marker: "unchanged", status: "active" },
          },
          failures: {
            chat: {
              code: "provider_outcome_indeterminate",
              httpStatus: 500,
              providerRequestId: "olx-operation-500",
              retryable: false,
            },
          },
          status: "indeterminate",
        },
      },
    });
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
    expect(JSON.stringify(audits)).not.toContain("sealed-access");
    expect(JSON.stringify(audits)).not.toContain("sealed-webhook");
  });

  it.each([401, 403])(
    "persists OLX %s as a non-retryable provider rejection",
    async (httpStatus) => {
      const target = createFailedOlxConnection();
      const repository = createTestCrmConnectionRepository([target]);

      await expect(
        retryOlxChatSetup(
          createServiceContext({
            actor: { id: "user-1", kind: "user" },
            entitlements: ["crm"],
            permissions: ["crm.messaging.connection.setup"],
            request: { requestId: "request-1" },
            storeId: "store-1",
            tenantId: "tenant-1",
          }),
          { connectionId: target.id },
          {
            crmConnectionCredentialVault: {
              open: vi.fn(async ({ sealed }: { sealed: string }) => sealed),
              seal: vi.fn(),
            },
            crmConnectionRepository: repository,
            crmRepository: {} as never,
            olxCrmCallbackOrigin: "https://api.example.test",
            olxCrmWebhookSetupProvider: {
              configureChat: vi.fn(async () => {
                throw new CrmConnectionSetupProviderError(
                  "OLX rejected webhook registration.",
                  "provider_rejected",
                  httpStatus,
                  undefined,
                  `olx-operation-${httpStatus}`,
                  false,
                );
              }),
              configureLeads: vi.fn(),
            },
          },
        ),
      ).rejects.toMatchObject({
        code: "provider_rejected",
        httpStatus,
        retryable: false,
      });

      const saved = await repository.findConnectionById(target.id);
      expect(saved).toMatchObject({
        metadata: {
          webhookSetup: {
            capabilities: {
              chat: { reason: "provider_rejected", status: "error" },
            },
            failures: {
              chat: {
                code: "provider_rejected",
                httpStatus,
                providerRequestId: `olx-operation-${httpStatus}`,
                retryable: false,
              },
            },
          },
        },
      });
    },
  );
});
