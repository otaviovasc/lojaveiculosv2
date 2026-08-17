import type {
  CrmWhatsappProvider,
  CrmWhatsappProviderConnection,
} from "./crmWhatsappTypes";

export const crmRoutingChannels = [
  "whatsapp",
  "instagram",
  "olx_chat",
] as const;

export type CrmRoutingChannel = (typeof crmRoutingChannels)[number];
export type CrmBotRoutingMode =
  "disabled" | "inherit_store_default" | "explicit_connection";

export type CrmRoutingBlockedCode =
  | "capability_unsupported"
  | "channel_incompatible"
  | "connection_inactive"
  | "connection_not_connected"
  | "connection_not_found"
  | "policy_not_configured"
  | "route_disabled"
  | "scope_mismatch";

export type CrmRoutingConnection = {
  active: boolean;
  capabilities: readonly string[];
  connected: boolean;
  displayName: string;
  id: string;
  provider: CrmWhatsappProvider;
};

export type CrmResolvedRoute = {
  blocked: {
    code: CrmRoutingBlockedCode;
    message: string;
    remediation: string;
  } | null;
  connection: CrmRoutingConnection | null;
  ready: boolean;
  requiredCapabilities: readonly string[];
};

export type CrmChannelRouting = {
  bot: CrmResolvedRoute & { mode: CrmBotRoutingMode };
  channel: CrmRoutingChannel;
  storeDefault: CrmResolvedRoute;
};

export type CrmRoutingPolicy = {
  channels: readonly CrmChannelRouting[];
  storeId: string;
  tenantId: string;
};

export type UpdateCrmRoutingPolicyInput = {
  bot: { connectionId?: string | null; mode: CrmBotRoutingMode };
  channel: CrmRoutingChannel;
  defaultConnectionId: string | null;
};

export type CrmRoutingCandidate = {
  connected: boolean;
  displayName: string;
  id: string;
  phone: string | null;
  provider: CrmWhatsappProvider;
  ready: boolean;
};

export function normalizeCrmRoutingPolicy(payload: unknown): CrmRoutingPolicy {
  const record = asRecord(payload);
  const channels = Array.isArray(record.channels)
    ? record.channels.map(normalizeChannel).filter(isDefined)
    : [];
  return {
    channels,
    storeId: readString(record.storeId) ?? "",
    tenantId: readString(record.tenantId) ?? "",
  };
}

export function readRoutingCandidates(
  connections: readonly CrmWhatsappProviderConnection[],
  policy: CrmRoutingPolicy | null,
): CrmRoutingCandidate[] {
  const candidates = new Map<string, CrmRoutingCandidate>();
  for (const connection of connections) {
    const normalized = normalizeLegacyConnection(connection);
    if (normalized) candidates.set(normalized.id, normalized);
  }
  for (const channel of policy?.channels ?? []) {
    for (const route of [channel.storeDefault, channel.bot]) {
      if (!route.connection || candidates.has(route.connection.id)) continue;
      candidates.set(route.connection.id, {
        connected: route.connection.connected,
        displayName: route.connection.displayName,
        id: route.connection.id,
        phone: null,
        provider: route.connection.provider,
        ready: route.ready,
      });
    }
  }
  return [...candidates.values()];
}

export function isCandidateForChannel(
  candidate: CrmRoutingCandidate,
  channel: CrmRoutingChannel,
) {
  if (channel === "whatsapp") {
    return (
      candidate.provider === "zapi" ||
      candidate.provider === "composio_whatsapp"
    );
  }
  if (channel === "instagram") {
    return candidate.provider === "composio_instagram";
  }
  return candidate.provider === "olx_chat";
}

function normalizeChannel(value: unknown): CrmChannelRouting | null {
  const record = asRecord(value);
  const channel = readChannel(record.channel);
  if (!channel) return null;
  const botRecord = asRecord(record.bot);
  const mode = readBotMode(botRecord.mode) ?? "disabled";
  return {
    bot: { ...normalizeRoute(botRecord), mode },
    channel,
    storeDefault: normalizeRoute(record.storeDefault),
  };
}

function normalizeRoute(value: unknown): CrmResolvedRoute {
  const record = asRecord(value);
  const blocked = asRecord(record.blocked);
  const code = readBlockedCode(blocked.code);
  return {
    blocked: code
      ? {
          code,
          message: readString(blocked.message) ?? "Rota indisponível.",
          remediation:
            readString(blocked.remediation) ?? "Selecione outra conexão.",
        }
      : null,
    connection: normalizeRoutingConnection(record.connection),
    ready: record.ready === true,
    requiredCapabilities: readStringArray(record.requiredCapabilities),
  };
}

function normalizeRoutingConnection(
  value: unknown,
): CrmRoutingConnection | null {
  const record = asRecord(value);
  const id = readString(record.id);
  const provider = readProvider(record.provider);
  if (!id || !provider) return null;
  return {
    active: record.active === true,
    capabilities: readStringArray(record.capabilities),
    connected: record.connected === true,
    displayName: readString(record.displayName) ?? id,
    id,
    provider,
  };
}

function normalizeLegacyConnection(value: unknown): CrmRoutingCandidate | null {
  const record = asRecord(value);
  const id = readString(record.id);
  const provider = readProvider(record.provider ?? record.channel);
  if (!id || !provider) return null;
  const live = asRecord(record.live);
  const rawStatus = readString(record.status)?.toLowerCase() ?? "";
  const connected =
    live.connected === true ||
    live.providerStatus === "connected" ||
    rawStatus === "connected";
  return {
    connected,
    displayName:
      readString(record.displayName) ?? readString(record.name) ?? id,
    id,
    phone: readString(record.phone) ?? readString(live.connectedPhone) ?? null,
    provider,
    // `ready` is a server-owned provider capability decision. In particular,
    // an OLX connection can be active and authenticated while ChatPendente;
    // inferring readiness from transport status would make that route
    // selectable before the webhook handshake is confirmed.
    ready: record.ready === true,
  };
}

function readProvider(value: unknown): CrmWhatsappProvider | null {
  if (typeof value !== "string") return null;
  switch (value.trim().toLowerCase()) {
    case "zapi":
    case "z-api":
      return "zapi";
    case "composio_whatsapp":
    case "official_whatsapp":
    case "whatsapp_official":
      return "composio_whatsapp";
    case "composio_instagram":
    case "instagram":
      return "composio_instagram";
    case "olx_chat":
      return "olx_chat";
    default:
      return null;
  }
}

function readChannel(value: unknown): CrmRoutingChannel | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  return crmRoutingChannels.find((channel) => channel === normalized) ?? null;
}

function readBotMode(value: unknown): CrmBotRoutingMode | null {
  return value === "disabled" ||
    value === "inherit_store_default" ||
    value === "explicit_connection"
    ? value
    : null;
}

function readBlockedCode(value: unknown): CrmRoutingBlockedCode | null {
  const codes: readonly CrmRoutingBlockedCode[] = [
    "capability_unsupported",
    "channel_incompatible",
    "connection_inactive",
    "connection_not_connected",
    "connection_not_found",
    "policy_not_configured",
    "route_disabled",
    "scope_mismatch",
  ];
  return typeof value === "string"
    ? (codes.find((code) => code === value) ?? null)
    : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}
