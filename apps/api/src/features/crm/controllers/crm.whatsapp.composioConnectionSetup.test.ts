import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import {
  createServiceContext,
  type StoreScopedServiceContext,
} from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import {
  completeComposioWhatsappConnection,
  selectComposioWhatsappSender,
} from "../../../domains/crm/services/CrmWhatsapp/composioWhatsappConnectionSetup.js";

describe("Composio WhatsApp setup", () => {
  it("discovers multiple WABAs without subscribing until one sender is selected", async () => {
    const { ports, subscribe } = fixture();

    const completed = await completeComposioWhatsappConnection(
      context(),
      { connectionId: "connection" },
      ports,
    );

    expect(completed.senders).toHaveLength(2);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("subscribes only the selected sender WABA and is idempotent after persistence", async () => {
    const { ports, subscribe } = fixture();

    await selectComposioWhatsappSender(
      context(),
      { connectionId: "connection", senderId: "phone-b" },
      ports,
    );
    await selectComposioWhatsappSender(
      context(),
      { connectionId: "connection", senderId: "phone-b" },
      ports,
    );

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledWith({
      businessAccountId: "waba-b",
      connectedAccountId: "ca_expected",
    });
  });

  it.each([
    { connectedAccountId: "ca_other", toolkit: "whatsapp" },
    { connectedAccountId: "ca_expected", toolkit: "gmail" },
  ])("rejects mismatched account identity or toolkit", async (account) => {
    const { ports, subscribe } = fixture(account);

    await expect(
      completeComposioWhatsappConnection(
        context(),
        { connectionId: "connection" },
        ports,
      ),
    ).rejects.toMatchObject({ code: "provider_rejected" });
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("requires the CRM entitlement throughout Official WhatsApp setup", async () => {
    const { ports, subscribe } = fixture();

    await expect(
      completeComposioWhatsappConnection(
        context([]),
        { connectionId: "connection" },
        ports,
      ),
    ).rejects.toThrow("Missing entitlement: crm");
    expect(subscribe).not.toHaveBeenCalled();
  });
});

function fixture(
  account: { connectedAccountId: string; toolkit: string } = {
    connectedAccountId: "ca_expected",
    toolkit: "whatsapp",
  },
) {
  const repository = createMemoryCrmConnectionRepository([connection()]);
  const subscribe = vi.fn(async () => ({ subscribed: true as const }));
  return {
    ports: {
      composioWhatsappOnboardingProvider: {
        createConnectLink: vi.fn(),
        discoverWhatsappResources: vi.fn(async () => ({
          businessAccounts: [
            { id: "waba-a", name: "A" },
            { id: "waba-b", name: "B" },
          ],
          phones: [
            {
              businessAccountId: "waba-a",
              displayName: "A",
              id: "phone-a",
              phone: "+551100000001",
            },
            {
              businessAccountId: "waba-b",
              displayName: "B",
              id: "phone-b",
              phone: "+551100000002",
            },
          ],
        })),
        subscribeWhatsappApp: subscribe,
        verifyConnectedAccount: vi.fn(async () => ({
          ...account,
          status: "active" as const,
          statusReason: null,
        })),
      },
      crmConnectionRepository: repository,
      crmRepository: createMemoryCrmRepository(),
    },
    subscribe,
  };
}

function context(entitlements: "crm"[] = ["crm"]): StoreScopedServiceContext {
  const base = createServiceContext({
    actor: { id: "owner", kind: "user" },
    entitlements,
    permissions: [
      "crm.messaging.connection.setup",
      "crm.routing.default.manage",
      "crm.whatsapp.integrations.manage",
    ],
    request: { requestId: "composio-test" },
    storeId: "store",
    tenantId: "tenant",
  });
  return {
    ...base,
    entitlements,
    storeId: "store",
    tenantId: "tenant",
  };
}

function connection(): CrmConnection {
  return {
    credentialsRef: { composio: { connectedAccountId: "ca_expected" } },
    displayName: "WhatsApp Oficial",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection",
    metadata: {},
    phone: null,
    provider: "composio_whatsapp",
    status: "sandbox",
    storeId: "store" as StoreId,
    tenantId: "tenant" as TenantId,
    webhookUrl: null,
  };
}
