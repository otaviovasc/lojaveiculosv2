import { describe, expect, it } from "vitest";
import type { CrmProvider } from "@lojaveiculosv2/shared";
import {
  isConnectedConnection,
  findDefaultFreeTextStartConnection,
  readConversationStartCapability,
  resolveCrmInboxConnectionSelection,
} from "./crmConnectionSelection";
import type { CrmRoutingPolicy } from "./crmRoutingTypes";
import type { CrmProviderConnection } from "./crmConversationTypes";

describe("CRM messaging connection selection", () => {
  it("uses the persisted route instead of globally preferring Z-API", () => {
    const zapi = createConnection("zapi", "zapi");
    const official = createConnection("meta_cloud", "official");

    expect(
      resolveCrmInboxConnectionSelection({
        activeSessionConnectionId: null,
        connectionFilterId: null,
        connections: [zapi, official],
        hasActiveSession: false,
        routingPolicy: policyWithChannelDefault(official),
      }),
    ).toEqual({
      operationalConnectionId: "official",
      viewConnectionId: "official",
    });
  });

  it("preserves an active cycle connection independently from the view filter", () => {
    const zapi = createConnection("zapi", "zapi");
    const official = createConnection("meta_cloud", "official");

    expect(
      resolveCrmInboxConnectionSelection({
        activeSessionConnectionId: "official",
        connectionFilterId: "zapi",
        connections: [zapi, official],
        hasActiveSession: true,
        routingPolicy: policyWithChannelDefault(zapi),
      }),
    ).toEqual({
      operationalConnectionId: "official",
      viewConnectionId: "zapi",
    });
  });

  it("fails closed when the route is blocked or the cycle connection is missing", () => {
    const zapi = createConnection("zapi", "zapi");
    const blockedPolicy = policyWithChannelDefault(zapi);
    const route = blockedPolicy.channels[0];
    if (route) {
      route.storeDefault.ready = false;
      route.storeDefault.blocked = {
        code: "connection_not_connected",
        message: "blocked",
        remediation: "reconnect",
      };
    }

    expect(
      resolveCrmInboxConnectionSelection({
        activeSessionConnectionId: null,
        connectionFilterId: null,
        connections: [zapi],
        hasActiveSession: false,
        routingPolicy: blockedPolicy,
      }).operationalConnectionId,
    ).toBeNull();
    expect(
      resolveCrmInboxConnectionSelection({
        activeSessionConnectionId: "missing",
        connectionFilterId: null,
        connections: [zapi],
        hasActiveSession: true,
        routingPolicy: policyWithChannelDefault(zapi),
      }).operationalConnectionId,
    ).toBeNull();
  });

  it("fails closed when multiple ready channels need an explicit route", () => {
    const instagram = createConnection("meta_cloud", "instagram");
    const official = createConnection("meta_cloud", "official");

    expect(isConnectedConnection(instagram)).toBe(true);
    expect(isConnectedConnection(official)).toBe(true);
  });

  it("keeps lead free-text initiation on Z-API when official channels coexist", () => {
    const official = createConnection("meta_cloud", "official");
    const zapi = createConnection("zapi", "zapi");

    expect(findDefaultFreeTextStartConnection([official, zapi])).toBe(zapi);
    expect(findDefaultFreeTextStartConnection([official])).toBeNull();
  });

  it("prefers an active official connection over a connected but paused Z-API", () => {
    const pausedZapi = {
      ...createConnection("zapi", "zapi"),
      state: "paused" as const,
    };
    const official = createConnection("meta_cloud", "official");

    expect(isConnectedConnection(pausedZapi)).toBe(false);
    expect(isConnectedConnection(official)).toBe(true);
    expect(findDefaultFreeTextStartConnection([pausedZapi])).toBeNull();
    expect(readConversationStartCapability(pausedZapi)).toMatchObject({
      canStart: false,
      mode: null,
      provider: "zapi",
    });
  });

  it("does not select disconnected or errored connections", () => {
    const disconnected = {
      ...createConnection("zapi", "disconnected"),
      readiness: {
        ready: false,
        reason: "disconnected",
        reasonCode: "provider_disconnected",
      },
      state: "paused" as const,
    };
    const errored = {
      ...createConnection("meta_cloud", "errored"),
      readiness: {
        ready: false,
        reason: "error",
        reasonCode: "provider_error",
      },
      state: "paused" as const,
    };
    expect(isConnectedConnection(disconnected)).toBe(false);
    expect(isConnectedConnection(errored)).toBe(false);
    expect(
      findDefaultFreeTextStartConnection([disconnected, errored]),
    ).toBeNull();
  });

  it("does not offer OLX Chat as a new-conversation channel", () => {
    const olx = createConnection("olx", "olx");

    expect(findDefaultFreeTextStartConnection([olx])).toBeNull();
    expect(readConversationStartCapability(olx)).toMatchObject({
      canStart: false,
      mode: null,
      provider: "olx",
    });
  });

  it("maps provider-specific conversation initiation rules", () => {
    expect(
      readConversationStartCapability(
        createConnection("meta_cloud", "official"),
      ),
    ).toMatchObject({
      canStart: true,
      mode: "template",
      provider: "meta_cloud",
    });
    expect(
      readConversationStartCapability(
        createConnection("meta_cloud", "instagram"),
      ),
    ).toMatchObject({
      canStart: false,
      mode: null,
      provider: "meta_cloud",
      unavailableReason:
        "No Instagram, o cliente precisa enviar a primeira mensagem.",
    });
    expect(
      readConversationStartCapability(createConnection("zapi", "zapi")),
    ).toMatchObject({
      canStart: true,
      mode: "text",
      provider: "zapi",
    });
  });
});

function policyWithChannelDefault(
  selected: CrmProviderConnection,
): CrmRoutingPolicy {
  return {
    channels: [
      {
        externalBot: {
          blocked: {
            code: "route_disabled",
            message: "disabled",
            remediation: "enable",
          },
          connection: null,
          mode: "disabled",
          ready: false,
          requiredCapabilities: ["text"],
        },
        channel: "whatsapp",
        storeDefault: {
          blocked: null,
          connection: {
            active: true,
            capabilities: ["text"],
            channel: selected.channel ?? "whatsapp",
            connected: true,
            displayName: selected.displayName,
            id: String(selected.id),
            isDefault: selected.isDefault ?? false,
            provider: selected.provider,
            readiness: { ready: true, reason: null, reasonCode: "ready" },
            state: selected.state ?? "active",
          },
          ready: true,
          requiredCapabilities: ["text"],
        },
      },
    ],
    storeId: "store-1",
    tenantId: "tenant-1",
  };
}

function createConnection(
  provider: CrmProvider,
  id: string,
): CrmProviderConnection {
  return {
    capabilities:
      provider === "olx"
        ? ["inbound", "text"]
        : provider === "meta_cloud"
          ? id === "instagram"
            ? ["inbound", "media", "outbound", "text"]
            : ["conversation_start", "media", "outbound", "templates", "text"]
          : ["conversation_start", "media", "outbound", "scheduling", "text"],
    channel:
      provider === "olx"
        ? "olx_chat"
        : provider === "meta_cloud" && id === "instagram"
          ? "instagram"
          : "whatsapp",
    displayName: id,
    id,
    isDefault: provider === "zapi",
    provider,
    readiness: { ready: true, reason: null, reasonCode: "ready" },
    state: "active",
  };
}

function capabilitiesForProvider(provider: CrmProvider) {
  if (provider === "meta_cloud") {
    return {
      audio: true,
      catalog: false,
      conversationStart: true,
      delete: false,
      documents: true,
      imageCaption: true,
      images: true,
      location: true,
      quickMessages: true,
      reactions: false,
      reply: true,
      scheduling: false,
      templates: true,
      text: true,
      vehicle: true,
      video: true,
    } as const;
  }
  if (provider === "olx") {
    return {
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
    } as const;
  }
  return {
    audio: true,
    catalog: true,
    conversationStart: true,
    delete: true,
    documents: true,
    imageCaption: true,
    images: true,
    location: true,
    quickMessages: true,
    reactions: true,
    reply: true,
    scheduling: true,
    templates: false,
    text: true,
    vehicle: true,
    video: true,
  } as const;
}
