import { describe, expect, it, vi } from "vitest";
import { createMemoryAuditSink } from "../../../../shared/auditSink.js";
import {
  createNoopServiceLogger,
  createServiceContext,
} from "../../../../shared/serviceContext.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import { onboardOlxCrmConnection } from "./onboardOlxCrmConnection.js";

describe("onboardOlxCrmConnection", () => {
  it("creates one vault-only connection and rotates only the access token on reconnect", async () => {
    const repository = createTestCrmConnectionRepository();
    const secrets = new Map<string, string>();
    let sequence = 0;
    const seal = vi.fn(
      async ({
        plaintext,
        purpose,
      }: {
        plaintext: string;
        purpose: string;
      }) => {
        const sealed = `sealed:${purpose}:${++sequence}`;
        secrets.set(sealed, plaintext);
        return sealed;
      },
    );
    const provider = {
      configureChat: vi.fn(async () => undefined),
      configureLeads: vi.fn(async () => undefined),
    };
    const ports = {
      crmConnectionCredentialVault: {
        seal,
        open: async ({ sealed }: { sealed: string }) =>
          secrets.get(sealed) ?? "",
      },
      crmConnectionRepository: repository,
      crmRepository: {} as never,
      olxCrmWebhookSetupProvider: provider,
    };

    const first = await onboardOlxCrmConnection(
      context(),
      input("token-one"),
      ports,
    );
    const [created] = await repository.listConnections({
      providers: ["olx_chat"],
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });
    const firstCredentials = created?.credentialsRef;
    const second = await onboardOlxCrmConnection(
      context(),
      input("token-two"),
      ports,
    );
    const [reconnected] = await repository.listConnections({
      providers: ["olx_chat"],
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });

    expect(second.connectionId).toBe(first.connectionId);
    expect(reconnected?.credentialsRef).not.toEqual(firstCredentials);
    expect(
      (reconnected?.credentialsRef.stored as Record<string, string>)
        .webhookSecret,
    ).toBe((firstCredentials?.stored as Record<string, string>).webhookSecret);
    expect(JSON.stringify(reconnected)).not.toContain("token-two");
    expect(provider.configureChat).toHaveBeenCalledTimes(1);
    expect(provider.configureLeads).toHaveBeenCalledTimes(1);
  });

  it("persists an explicit retryable error when one registration fails", async () => {
    const repository = createTestCrmConnectionRepository();
    const secrets = new Map<string, string>();
    const ports = {
      crmConnectionCredentialVault: {
        seal: async ({
          plaintext,
          purpose,
        }: {
          plaintext: string;
          purpose: string;
        }) => {
          const sealed = `sealed:${purpose}`;
          secrets.set(sealed, plaintext);
          return sealed;
        },
        open: async ({ sealed }: { sealed: string }) =>
          secrets.get(sealed) ?? "",
      },
      crmConnectionRepository: repository,
      crmRepository: {} as never,
      olxCrmWebhookSetupProvider: {
        configureLeads: async () => undefined,
        configureChat: async () => {
          throw new Error("down");
        },
      },
    };
    await expect(
      onboardOlxCrmConnection(context(), input("token"), ports),
    ).rejects.toThrow("down");
    const [connection] = await repository.listConnections({
      providers: ["olx_chat"],
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });
    expect(connection).toMatchObject({
      status: "error",
      metadata: {
        webhookSetup: {
          lastErrorCode: "registration_failed",
          status: "failed",
        },
      },
    });
  });

  it.each(["registration_succeeded", "registration_failed"] as const)(
    "fails closed when the setup lease is lost after %s",
    async (outcome) => {
      const baseRepository = createTestCrmConnectionRepository();
      const repository = {
        ...baseRepository,
        finishOlxWebhookSetup: vi.fn(async () => null),
      };
      const secrets = new Map<string, string>();
      const ports = {
        crmConnectionCredentialVault: {
          seal: async ({
            plaintext,
            purpose,
          }: {
            plaintext: string;
            purpose: string;
          }) => {
            const sealed = `sealed:${purpose}`;
            secrets.set(sealed, plaintext);
            return sealed;
          },
          open: async ({ sealed }: { sealed: string }) =>
            secrets.get(sealed) ?? "",
        },
        crmConnectionRepository: repository,
        crmRepository: {} as never,
        olxCrmWebhookSetupProvider: {
          configureLeads: async () => undefined,
          configureChat: async () => {
            if (outcome === "registration_failed") throw new Error("down");
          },
        },
      };

      await expect(
        onboardOlxCrmConnection(context(), input("token"), ports),
      ).rejects.toThrow("setup lease was lost");
      expect(repository.finishOlxWebhookSetup).toHaveBeenCalled();
      const [connection] = await repository.listConnections({
        providers: ["olx_chat"],
        storeId: "store_1" as never,
        tenantId: "tenant_1" as never,
      });
      expect(connection?.status).not.toBe("active");
    },
  );
});

function context() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit: createMemoryAuditSink(),
    entitlements: ["crm"],
    logger: createNoopServiceLogger(),
    permissions: ["crm.messaging.connection.setup"],
    request: { requestId: "request_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}
function input(accessToken: string) {
  return {
    accessToken,
    canonicalApiOrigin: "https://v2.example.test",
    providerAccountId: "olx_account",
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}
