import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  authorizeComposioWhatsappConnection,
  completeComposioWhatsappConnection,
  selectComposioWhatsappSender,
} from "./composioWhatsappConnectionSetup.js";

const storeId = "11111111-1111-4111-8111-111111111111";
const tenantId = "22222222-2222-4222-8222-222222222222";

describe("Composio Instagram connection setup", () => {
  it("returns every explicit professional account/page pair for selection", async () => {
    const { ports, subscribe } = fixture();

    const result = await completeComposioWhatsappConnection(
      context(),
      { connectionId: "connection_ig" },
      ports,
    );

    expect(result.nextAction).toBe("select_sender");
    expect(result.senders).toEqual([
      expect.objectContaining({
        pageId: "page_a",
        senderId: "ig_a",
        subscriptionTargetId: "page_a",
      }),
      expect.objectContaining({
        pageId: "page_b",
        senderId: "ig_b",
        subscriptionTargetId: "page_b",
      }),
    ]);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("persists the native sender separately from provider subscription evidence", async () => {
    const { ports, repository, subscribe } = fixture();

    const result = await selectComposioWhatsappSender(
      context(),
      { connectionId: "connection_ig", senderId: "ig_b" },
      ports,
    );

    expect(subscribe).toHaveBeenCalledWith({
      connectedAccountId: "ca_instagram",
      senderId: "ig_b",
      subscriptionTargetId: "page_b",
    });
    expect(result).toMatchObject({
      channel: "instagram",
      externalConnectionId: "ig_b",
      ready: true,
      status: "active",
    });
    await expect(
      repository.findConnectionById("connection_ig"),
    ).resolves.toMatchObject({
      externalConnectionId: "ig_b",
      metadata: {
        composioInstagramAccountId: "ig_b",
        composioPageId: "page_b",
        composioSubscriptionEvidence: {
          fields: ["messages"],
          providerConfirmed: true,
          targetId: "page_b",
        },
        providerConnected: true,
      },
    });
  });

  it("does not mark the connection ready without matching provider evidence", async () => {
    const { ports, repository } = fixture({
      fields: [],
      subscribed: true,
      targetId: "page_b",
    });

    await expect(
      selectComposioWhatsappSender(
        context(),
        { connectionId: "connection_ig", senderId: "ig_b" },
        ports,
      ),
    ).rejects.toMatchObject({ code: "provider_outcome_indeterminate" });
    await expect(
      repository.findConnectionById("connection_ig"),
    ).resolves.toMatchObject({ externalConnectionId: null, status: "sandbox" });
  });

  it("clears stale readiness before starting reauthorization", async () => {
    const stale = connection();
    stale.externalConnectionId = "ig_old";
    stale.phone = "stale-phone";
    stale.status = "active";
    stale.metadata = {
      composioInstagramAccountId: "ig_old",
      composioInstagramLoginMode: "facebook",
      composioPageId: "page_old",
      composioSubscriptionEvidence: {
        fields: ["messages"],
        providerConfirmed: true,
        targetId: "page_old",
      },
      providerConnected: true,
    };
    const repository = createTestCrmConnectionRepository([stale]);
    const ports: CrmServicePorts = {
      composioWhatsappOnboardingProvider: {
        createConnectLink: vi.fn(async () => ({
          connectedAccountId: "ca_new",
          expiresAt: "2026-08-18T18:00:00.000Z",
          redirectUrl: "https://connect.composio.dev/new",
        })),
        discoverInstagramResources: vi.fn(),
        discoverWhatsappResources: vi.fn(),
        subscribeInstagramApp: vi.fn(),
        subscribeWhatsappApp: vi.fn(),
        verifyConnectedAccount: vi.fn(),
      },
      crmConnectionRepository: repository,
      crmRepository: {} as never,
    };

    await authorizeComposioWhatsappConnection(
      context(),
      { connectionId: stale.id },
      ports,
    );

    await expect(
      repository.findConnectionById(stale.id),
    ).resolves.toMatchObject({
      credentialsRef: { composio: { connectedAccountId: "ca_new" } },
      externalConnectionId: null,
      metadata: {},
      phone: null,
      status: "sandbox",
    });
  });
});

function fixture(
  evidence = {
    fields: ["messages"] as readonly string[],
    subscribed: true as const,
    targetId: "page_b",
  },
) {
  const repository = createTestCrmConnectionRepository([connection()]);
  const subscribe = vi.fn(async () => evidence);
  const ports: CrmServicePorts = {
    composioWhatsappOnboardingProvider: {
      createConnectLink: vi.fn(),
      discoverInstagramResources: vi.fn(async () => ({
        senders: [
          sender("ig_a", "page_a", "Dealer A"),
          sender("ig_b", "page_b", "Dealer B"),
        ],
      })),
      discoverWhatsappResources: vi.fn(),
      subscribeInstagramApp: subscribe,
      subscribeWhatsappApp: vi.fn(),
      verifyConnectedAccount: vi.fn(async () => ({
        connectedAccountId: "ca_instagram",
        status: "active" as const,
        statusReason: null,
        toolkit: "instagram",
      })),
    },
    crmConnectionRepository: repository,
    crmRepository: {} as never,
  };
  return { ports, repository, subscribe };
}

function sender(senderId: string, pageId: string, displayName: string) {
  return {
    accountType: "BUSINESS" as const,
    displayName,
    loginMode: "facebook" as const,
    pageId,
    pageName: `${displayName} Page`,
    senderId,
    subscriptionFields: ["messages"],
    subscriptionTargetId: pageId,
    username: displayName.toLowerCase().replace(" ", "."),
  };
}

function context() {
  return createServiceContext({
    actor: { id: "owner", kind: "user" },
    entitlements: ["crm"],
    permissions: ["crm.messaging.connection.setup"],
    request: { requestId: "request_instagram" },
    storeId,
    tenantId,
  });
}

function connection(): CrmConnection {
  return {
    credentialsRef: { composio: { connectedAccountId: "ca_instagram" } },
    displayName: "Instagram",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection_ig",
    metadata: {},
    phone: null,
    provider: "composio_instagram",
    status: "sandbox",
    storeId: storeId as StoreId,
    tenantId: tenantId as TenantId,
    webhookUrl: null,
  };
}
