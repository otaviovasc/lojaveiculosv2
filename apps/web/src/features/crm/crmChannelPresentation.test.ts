import { describe, expect, it } from "vitest";
import {
  readCrmChannelIdentity,
  readOlxAuthorizationAction,
  readOlxChannelOperations,
} from "./crmChannelPresentation";
import type {
  CrmProviderCapabilities,
  CrmProviderConnection,
} from "./crmConversationTypes";
import type { MarketplaceProviderState } from "../marketplaces/types";

describe("readOlxChannelOperations", () => {
  it("keeps chat, leads and stock as independent server-owned states", () => {
    const operations = readOlxChannelOperations(
      [createOlxConnection()],
      createMarketplaceState("connected", {
        leads: capability("lead_ingestion", "error", "provider_rejected"),
        stock: capability("inventory_sync", "active", null),
      }),
    );

    expect(operations.chat).toMatchObject({ label: "Chat", state: "active" });
    expect(operations.leads).toMatchObject({
      label: "Leads",
      state: "failed",
    });
    expect(operations.stock).toMatchObject({
      label: "Estoque",
      state: "active",
    });
  });

  it("offers no reauthorization for a valid account with active capabilities", () => {
    expect(
      readOlxAuthorizationAction(createMarketplaceState("connected")),
    ).toBeNull();
  });

  it("offers chat reconfiguration when the marketplace is valid but chat is pending", () => {
    expect(
      readOlxAuthorizationAction(createMarketplaceState("connected"), {
        state: "pending",
      }),
    ).toMatchObject({ label: "Reconfigurar OLX" });
  });

  it("shows a rejected Chat registration as failed instead of pending", () => {
    const connection = createOlxConnection();
    connection.ready = false;
    connection.live!.providerStatus = "disconnected";
    const operations = readOlxChannelOperations(
      [connection],
      createMarketplaceState("connected", {
        chat: capability("messaging", "error", "provider_rejected"),
      }),
    );

    expect(operations.chat).toMatchObject({
      detail:
        "O provedor recusou o setup. Revise a conta e tente reconfigurar.",
      label: "Chat",
      state: "failed",
    });
  });

  it("lets canonical readiness false override a connected live provider", () => {
    const connection = createOlxConnection();
    connection.live!.providerStatus = "connected";
    connection.live!.connected = true;
    connection.ready = true;
    connection.readiness = {
      ready: false,
      reason: "Setup canônico pendente.",
      reasonCode: "setup_pending",
    };

    expect(
      readOlxChannelOperations(
        [connection],
        createMarketplaceState("connected"),
      ).chat,
    ).toEqual({
      detail: "Setup canônico pendente.",
      label: "Chat",
      state: "failed",
    });
  });

  it("renders an indeterminate provider outcome without enabling retry", async () => {
    const { readOlxChatRetryTarget } = await import("./crmChannelPresentation");
    const connection = createOlxConnection();
    connection.readiness = {
      ready: false,
      reason: "Confirmação pendente.",
      reasonCode: "provider_outcome_indeterminate",
    };
    const marketplaceState = createMarketplaceState("connected");
    const chat = marketplaceState.capabilities?.chat;
    if (!chat) throw new Error("Expected OLX Chat capability fixture.");
    (chat as { reason: string | null }).reason =
      "provider_outcome_indeterminate";
    chat.status = "active";

    const chatOperation = readOlxChannelOperations(
      [connection],
      marketplaceState,
    ).chat;
    expect(chatOperation).toEqual({
      detail:
        "A OLX retornou erro interno durante a ativação. Não repita o setup automaticamente; aguarde ou acione o suporte de integração.",
      label: "Chat",
      state: "indeterminate",
    });
    expect(readOlxChatRetryTarget([connection], marketplaceState)).toBeNull();
    expect(
      readOlxAuthorizationAction(marketplaceState, chatOperation),
    ).toBeNull();
  });

  it("distinguishes missing scopes from degraded setup actions", () => {
    expect(
      readOlxAuthorizationAction(
        createMarketplaceState("connected", {
          stock: capability("inventory_sync", "blocked", "missing_scope"),
        }),
      )?.label,
    ).toBe("Reautorizar OLX");
    expect(
      readOlxAuthorizationAction(
        createMarketplaceState("connected", {
          chat: capability("messaging", "error", "runtime_unavailable"),
        }),
      )?.label,
    ).toBe("Reconfigurar OLX");
  });

  it("does not claim success without marketplace state", () => {
    const operations = readOlxChannelOperations([], undefined);

    expect(operations.chat.state).toBe("not_connected");
    expect(operations.leads.state).toBe("not_connected");
    expect(operations.stock.state).toBe("not_connected");
  });

  it("shows every OLX capability as not connected before OAuth", () => {
    const operations = readOlxChannelOperations([], {
      accountId: null,
      capabilities: null,
      connectionStatus: "not_connected",
      lastSyncSummary: null,
      provider: "olx" as const,
      requirements: [],
    });

    expect(operations).toEqual({
      chat: {
        detail: "Autorize a conta OLX para habilitar esta capacidade.",
        label: "Chat",
        state: "not_connected",
      },
      leads: {
        detail: "Autorize a conta OLX para habilitar esta capacidade.",
        label: "Leads",
        state: "not_connected",
      },
      stock: {
        detail: "Autorize a conta OLX para habilitar esta capacidade.",
        label: "Estoque",
        state: "not_connected",
      },
    });
  });
});

describe("readCrmChannelIdentity", () => {
  it("does not collapse channel, provider and broker labels", () => {
    expect(
      readCrmChannelIdentity({
        broker: "Gateway Loja",
        channel: "olx_chat",
        provider: "olx",
      }),
    ).toEqual({
      brokerLabel: "Gateway Loja",
      channelLabel: "OLX Chat",
      providerLabel: "OLX Chat",
    });
  });
});

function createOlxConnection(): CrmProviderConnection {
  return {
    capabilities: textOnlyCapabilities,
    channel: "olx_chat",
    displayName: "OLX",
    externalConnectionId: "olx_1",
    externalInstanceId: null,
    id: "connection_1",
    live: {
      checkedAt: "2099-01-01T00:00:00.000Z",
      connected: false,
      connectedPhone: null,
      providerStatus: "unknown",
      smartphoneConnected: null,
    },
    phone: null,
    provider: "olx",
    ready: true,
    readiness: { ready: true, reason: null, reasonCode: null },
    status: "active",
    webhookUrl: null,
  };
}

function createMarketplaceState(
  connectionStatus: MarketplaceProviderState["connectionStatus"],
  overrides: Partial<
    NonNullable<MarketplaceProviderState["capabilities"]>
  > = {},
): MarketplaceProviderState {
  return {
    accountId: "account_1",
    capabilities: {
      chat: capability("messaging", "active", null),
      leads: capability("lead_ingestion", "active", null),
      stock: capability("inventory_sync", "active", null),
      ...overrides,
    },
    connectionStatus,
    lastSyncSummary: null,
    provider: "olx",
    requirements: [],
  };
}

function capability(
  name: "inventory_sync" | "lead_ingestion" | "messaging",
  status: "active" | "blocked" | "error",
  reason:
    | "access_denied"
    | "missing_scope"
    | "provider_outcome_indeterminate"
    | "provider_rejected"
    | "runtime_unavailable"
    | null,
) {
  return {
    capability: name,
    grantState:
      reason === "missing_scope" ? ("denied" as const) : ("granted" as const),
    reason,
    status,
  };
}

const textOnlyCapabilities: CrmProviderCapabilities = {
  audio: false,
  catalog: false,
  conversationStart: false,
  delete: false,
  documents: false,
  imageCaption: false,
  images: false,
  location: false,
  quickMessages: false,
  reactions: false,
  reply: false,
  scheduling: false,
  templates: false,
  text: true,
  vehicle: false,
  video: false,
};

describe("groupCrmConnectionsByChannel", () => {
  it("groups strictly by the server DTO channel, never by provider", async () => {
    const { groupCrmConnectionsByChannel } =
      await import("./crmChannelPresentation");
    const olxWithoutChannel = {
      ...createOlxConnection(),
      id: "olx-no-channel",
      provider: "olx" as const,
    };
    delete (olxWithoutChannel as { channel?: unknown }).channel;
    const groups = groupCrmConnectionsByChannel([olxWithoutChannel]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      channel: "unknown",
      invalid: true,
    });
    expect(groups[0]?.connections.map((item) => item.id)).toEqual([
      "olx-no-channel",
    ]);
  });

  it("keeps valid server channels in their own groups", async () => {
    const { groupCrmConnectionsByChannel } =
      await import("./crmChannelPresentation");
    const whatsapp = {
      ...createOlxConnection(),
      channel: "whatsapp" as const,
      id: "wa-1",
      provider: "zapi" as const,
    };
    const olx = { ...createOlxConnection(), channel: "olx_chat" as const };

    const groups = groupCrmConnectionsByChannel([olx, whatsapp]);

    expect(groups.map((group) => group.channel)).toEqual([
      "whatsapp",
      "olx_chat",
    ]);
  });
});

describe("readConnectionReadinessBadge", () => {
  it("reads Pronto only from server readiness", async () => {
    const { readConnectionReadinessBadge } =
      await import("./crmChannelPresentation");
    const ready = {
      ...createOlxConnection(),
      readiness: { ready: true, reason: null, reasonCode: null },
    };
    expect(readConnectionReadinessBadge(ready)).toMatchObject({
      label: "Pronto",
      tone: "success",
    });

    const { readiness: _readiness, ...missingReadiness } = ready;
    expect(readConnectionReadinessBadge(missingReadiness)).toMatchObject({
      label: "Estado de prontidão indisponível",
      tone: "warning",
    });
  });

  it("surfaces paused and error states honestly", async () => {
    const { readConnectionReadinessBadge } =
      await import("./crmChannelPresentation");
    const paused = { ...createOlxConnection(), status: "paused" as const };
    expect(readConnectionReadinessBadge(paused).label).toBe("Pausado");
    const failed = { ...createOlxConnection(), status: "error" as const };
    expect(readConnectionReadinessBadge(failed)).toMatchObject({
      label: "Erro",
      tone: "danger",
    });
  });
});

describe("readOlxChatRetryTarget", () => {
  it("offers a retry for a provider-internal Chat failure with a valid authorization", async () => {
    const { readOlxChatRetryTarget } = await import("./crmChannelPresentation");
    const connection = createOlxConnection();
    connection.ready = false;
    connection.readiness = {
      ready: false,
      reason: "O provedor recusou o setup.",
      reasonCode: "provider_rejected",
    };
    connection.live!.providerStatus = "disconnected";
    const target = readOlxChatRetryTarget(
      [connection],
      createMarketplaceState("connected", {
        chat: capability("messaging", "error", "provider_rejected"),
      }),
    );

    expect(target).toMatchObject({ connectionId: "connection_1" });
  });

  it("offers retry from canonical not-ready state even when live transport is connected", async () => {
    const { readOlxChatRetryTarget } = await import("./crmChannelPresentation");
    const connection = createOlxConnection();
    connection.live!.providerStatus = "connected";
    connection.live!.connected = true;
    connection.readiness = {
      ready: false,
      reason: "Setup canônico pendente.",
      reasonCode: "setup_pending",
    };

    expect(
      readOlxChatRetryTarget([connection], createMarketplaceState("connected")),
    ).toEqual({
      connectionId: "connection_1",
      detail: "Setup canônico pendente.",
    });
  });

  it("never offers a retry when scopes are missing or the account is not connected", async () => {
    const { readOlxChatRetryTarget } = await import("./crmChannelPresentation");
    const connection = createOlxConnection();
    expect(
      readOlxChatRetryTarget(
        [connection],
        createMarketplaceState("connected", {
          chat: capability("messaging", "blocked", "missing_scope"),
        }),
      ),
    ).toBeNull();
    expect(
      readOlxChatRetryTarget(
        [connection],
        createMarketplaceState("reconnect_required"),
      ),
    ).toBeNull();
  });
});
