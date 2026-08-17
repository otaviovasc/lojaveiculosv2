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
  channel?: CrmRoutingChannel;
  connected: boolean;
  displayName: string;
  id: string;
  provider: CrmWhatsappProvider;
  readiness?: { ready: boolean; reason: string | null };
  isDefault?: boolean;
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
  channel: CrmRoutingChannel;
  connected: boolean;
  displayName: string;
  id: string;
  phone: string | null;
  provider: CrmWhatsappProvider;
  ready: boolean;
  state: CrmWhatsappProviderConnection["state"];
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
    if (!connection.channel || !connection.readiness) continue;
    candidates.set(String(connection.id), {
      channel: connection.channel,
      connected: connection.readiness.ready,
      displayName: connection.displayName,
      id: String(connection.id),
      phone: connection.phone,
      provider: connection.provider,
      ready: connection.readiness.ready,
      state: connection.state,
    });
  }
  for (const channel of policy?.channels ?? []) {
    for (const route of [channel.storeDefault, channel.bot]) {
      if (!route.connection || candidates.has(route.connection.id)) continue;
      candidates.set(route.connection.id, {
        channel: channel.channel,
        connected: route.connection.connected,
        displayName: route.connection.displayName,
        id: route.connection.id,
        phone: null,
        provider: route.connection.provider,
        ready: route.ready,
        state: route.connection.active ? "active" : undefined,
      });
    }
  }
  return [...candidates.values()];
}

export function isCandidateForChannel(
  candidate: CrmRoutingCandidate,
  channel: CrmRoutingChannel,
) {
  return candidate.channel === channel;
}

function normalizeChannel(value: unknown): CrmChannelRouting | null {
  const record = asRecord(value);
  const channel = readChannel(record.channel);
  if (!channel) return null;
  const botRecord = asRecord(record.bot);
  const mode = readBotMode(botRecord.mode) ?? "disabled";
  return {
    bot: { ...normalizeRoute(botRecord, channel), mode },
    channel,
    storeDefault: normalizeRoute(record.storeDefault, channel),
  };
}

function normalizeRoute(
  value: unknown,
  channel?: CrmRoutingChannel,
): CrmResolvedRoute {
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
    connection: normalizeRoutingConnection(record.connection, channel),
    ready: record.ready === true,
    requiredCapabilities: readStringArray(record.requiredCapabilities),
  };
}

function normalizeRoutingConnection(
  value: unknown,
  channel?: CrmRoutingChannel,
): CrmRoutingConnection | null {
  const record = asRecord(value);
  const id = readString(record.id);
  const provider = readProvider(record.provider);
  if (!id || !provider) return null;
  return {
    active: record.active === true,
    capabilities: readStringArray(record.capabilities),
    channel: readChannel(record.channel) ?? channel ?? "whatsapp",
    connected: record.connected === true,
    displayName: readString(record.displayName) ?? id,
    id,
    isDefault: record.isDefault === true,
    provider,
    readiness: {
      ready:
        record.readiness === true || asRecord(record.readiness).ready === true,
      reason: readString(asRecord(record.readiness).reason),
    },
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
    case "meta_cloud":
      return "meta_cloud";
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
