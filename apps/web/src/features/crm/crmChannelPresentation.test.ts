import { describe, expect, it } from "vitest";
import {
  readCrmChannelIdentity,
  readOlxAuthorizationAction,
  readOlxChannelOperations,
} from "./crmChannelPresentation";
import type {
  CrmWhatsappProviderCapabilities,
  CrmWhatsappProviderConnection,
} from "./crmWhatsappTypes";
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

    expect(operations.chat.state).toBe("indeterminate");
    expect(operations.leads.state).toBe("indeterminate");
    expect(operations.stock.state).toBe("indeterminate");
  });
});

describe("readCrmChannelIdentity", () => {
  it("does not collapse channel, provider and broker labels", () => {
    expect(
      readCrmChannelIdentity({
        broker: "Gateway Loja",
        channel: "OLX_CHAT",
        provider: "olx_chat",
      }),
    ).toEqual({
      brokerLabel: "Gateway Loja",
      channelLabel: "OLX Chat",
      providerLabel: "OLX Chat",
    });
  });
});

function createOlxConnection(): CrmWhatsappProviderConnection {
  return {
    capabilities: textOnlyCapabilities,
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
    provider: "olx_chat",
    ready: true,
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

const textOnlyCapabilities: CrmWhatsappProviderCapabilities = {
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
