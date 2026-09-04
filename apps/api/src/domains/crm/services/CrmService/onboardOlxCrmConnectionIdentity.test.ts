import { describe, expect, it, vi } from "vitest";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import {
  olxOnboardingContext as context,
  olxOnboardingInput as input,
} from "../../testSupportOlxOnboarding.js";
import { onboardOlxCrmConnection } from "./onboardOlxCrmConnection.js";

describe("OLX CRM connection identity", () => {
  it("archives the old identity and creates a fresh UUID and webhook secret", async () => {
    const repository = createTestCrmConnectionRepository();
    const secrets = new Map<string, string>();
    let sequence = 0;
    const provider = {
      configureChat: vi.fn(async () => undefined),
      configureLeads: vi.fn(async () => undefined),
    };
    const serviceContext = context();
    const audit = vi.spyOn(serviceContext.audit, "record");
    const ports = {
      crmConnectionCredentialVault: {
        seal: async ({ plaintext }: { plaintext: string }) => {
          const sealed = `sealed:${++sequence}`;
          secrets.set(sealed, plaintext);
          return sealed;
        },
        open: async ({ sealed }: { sealed: string }) =>
          secrets.get(sealed) ?? "",
      },
      crmConnectionRepository: repository,
      crmRepository: {} as never,
      olxCrmWebhookSetupProvider: provider,
    };
    const first = await onboardOlxCrmConnection(
      serviceContext,
      { ...input("token-one"), providerAccountId: "olx-account-one" },
      ports,
    );
    const firstConnection = await repository.findConnectionById(
      first.connectionId,
    );
    const second = await onboardOlxCrmConnection(
      serviceContext,
      { ...input("token-two"), providerAccountId: "olx-account-two" },
      ports,
    );
    const secondConnection = await repository.findConnectionById(
      second.connectionId,
    );

    expect(second.connectionId).not.toBe(first.connectionId);
    expect(firstConnection?.status).toBe("archived");
    expect(secret(firstConnection?.credentialsRef)).not.toBe(
      secret(secondConnection?.credentialsRef),
    );
    expect(provider.configureChat).toHaveBeenCalledTimes(2);
    expect(provider.configureLeads).toHaveBeenCalledTimes(2);
    expect(audit.mock.calls.map(([event]) => event.action)).toContain(
      "crm.connection.olx.identity_replaced",
    );
  });

  it("rejects onboarding without an authoritative provider identity", async () => {
    const repository = createTestCrmConnectionRepository();
    await expect(
      onboardOlxCrmConnection(
        context(),
        { ...input("token"), providerAccountId: null },
        {
          crmConnectionCredentialVault: { open: vi.fn(), seal: vi.fn() },
          crmConnectionRepository: repository,
          crmRepository: {} as never,
          olxCrmWebhookSetupProvider: {
            configureChat: vi.fn(),
            configureLeads: vi.fn(),
          },
        },
      ),
    ).rejects.toThrow("authoritatively verified");
    await expect(
      repository.listConnections({
        channels: ["olx_chat"],
        providers: ["olx"],
        storeId: "store_1" as never,
        tenantId: "tenant_1" as never,
      }),
    ).resolves.toHaveLength(0);
  });
});

function secret(credentialsRef: Record<string, unknown> | undefined) {
  const stored = credentialsRef?.stored;
  return stored && typeof stored === "object" && !Array.isArray(stored)
    ? (stored as Record<string, unknown>).webhookSecret
    : null;
}
