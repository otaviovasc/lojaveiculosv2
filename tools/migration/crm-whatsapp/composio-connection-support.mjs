const primaryStoreId = "66666666-6666-4666-8666-666666666666";
const primaryTenantId = "77777777-7777-4777-8777-777777777777";

const channels = {
  instagram: {
    authConfigEnv: "COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID",
    displayName: "Instagram oficial",
    id: "24000000-0000-4000-8000-000000000103",
    provider: "composio_instagram",
    toolkit: "instagram",
  },
  whatsapp: {
    authConfigEnv: "COMPOSIO_WHATSAPP_AUTH_CONFIG_ID",
    displayName: "WhatsApp oficial",
    id: "24000000-0000-4000-8000-000000000102",
    provider: "composio_whatsapp",
    toolkit: "whatsapp",
  },
};

export function parseComposioArgs(argv) {
  const values = argv.filter((value) => value !== "--");
  const command = values[0]?.startsWith("--")
    ? "diagnose"
    : (values.shift() ?? "diagnose");
  if (!["diagnose", "link", "seed-local"].includes(command)) {
    throw new Error(`Unknown Composio command: ${command}`);
  }
  const flags = {};
  for (let index = 0; index < values.length; index += 1) {
    const flag = values[index];
    if (!flag?.startsWith("--"))
      throw new Error(`Unexpected argument: ${flag}`);
    const name = flag.slice(2);
    const value = values[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Flag --${name} requires a value.`);
    }
    flags[name] = value;
    index += 1;
  }
  return { command, flags };
}

export function channelConfig(channel) {
  const config = channels[channel];
  if (!config) {
    throw new Error("Channel must be whatsapp or instagram.");
  }
  return config;
}

export function resolveAuthConfigId(channel, flags, env = process.env) {
  const config = channelConfig(channel);
  const value =
    flags["auth-config"] ??
    flags[`${channel}-auth-config`] ??
    env[config.authConfigEnv];
  if (!value?.startsWith("ac_")) {
    throw new Error(
      `${config.authConfigEnv} or an ac_ --auth-config value is required.`,
    );
  }
  return value;
}

export function summarizeAuthConfig(channel, authConfigId, payload) {
  const config = channelConfig(channel);
  const toolkit = readRecord(payload.toolkit);
  return {
    authConfigId,
    authScheme: readString(payload.auth_scheme),
    channel,
    isComposioManaged: payload.is_composio_managed === true,
    toolkit: readString(toolkit.slug) ?? config.toolkit,
  };
}

export function summarizeConnectedAccounts(payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  return items.map((item) => {
    const account = readRecord(item);
    return {
      id: readString(account.id),
      status: readString(account.status),
      toolkit: readString(readRecord(account.toolkit).slug),
    };
  });
}

export function buildSeedConnection(channel, flags, env = process.env) {
  const config = channelConfig(channel);
  const connectedAccountId =
    flags["connected-account"] ??
    env[`COMPOSIO_${channel.toUpperCase()}_CONNECTED_ACCOUNT_ID`];
  if (!connectedAccountId?.startsWith("ca_")) {
    throw new Error("A ca_ --connected-account value is required.");
  }
  const senderId =
    flags["sender-id"] ?? env[`COMPOSIO_${channel.toUpperCase()}_SENDER_ID`];
  if (!senderId?.trim()) throw new Error("--sender-id is required.");
  const graphVersion =
    flags["graph-version"] ?? env.COMPOSIO_META_GRAPH_VERSION;
  if (!/^v\d+\.\d+$/u.test(graphVersion ?? "")) {
    throw new Error("--graph-version must use vN.N.");
  }
  return {
    connectedAccountId,
    credentialsRef: {
      composio: { connectedAccountId },
      env: { apiKey: "COMPOSIO_API_KEY" },
      mode: "composio",
    },
    displayName: config.displayName,
    graphVersion,
    id: config.id,
    phone: channel === "whatsapp" ? (flags.phone ?? null) : null,
    provider: config.provider,
    senderId: senderId.trim(),
    storeId: primaryStoreId,
    tenantId: primaryTenantId,
    toolkit: config.toolkit,
  };
}

export async function seedLocalComposioConnection(db, connection) {
  const metadata = {
    fixture: true,
    graphVersion: connection.graphVersion,
    officialOperation: false,
    purpose: "local_composio_rehearsal",
    safeToReset: true,
    source: "local_operator_command",
  };
  await db.unsafe(
    `INSERT INTO crm_connections
      (id, credentials_ref, display_name, external_connection_id, metadata,
       phone, provider, status, store_id, tenant_id)
     VALUES ($1, $2::jsonb, $3, $4, $5::jsonb, $6, $7, 'sandbox', $8, $9)
     ON CONFLICT (store_id, provider, display_name) DO UPDATE SET
       credentials_ref=excluded.credentials_ref,
       external_connection_id=excluded.external_connection_id,
       metadata=excluded.metadata,
       phone=excluded.phone,
       status=excluded.status,
       updated_at=now()`,
    [
      connection.id,
      JSON.stringify(connection.credentialsRef),
      connection.displayName,
      connection.senderId,
      JSON.stringify(metadata),
      connection.phone,
      connection.provider,
      connection.storeId,
      connection.tenantId,
    ],
  );
}

function readRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function readString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
