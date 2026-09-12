import postgres from "postgres";
import { assertSafeLocalDatabaseOperation } from "../../db/local-database-safety.mjs";
import { loadLocalEnv } from "../../storage/storageScriptEnv.mjs";
import {
  buildSeedConnection,
  channelConfig,
  parseComposioArgs,
  resolveAuthConfigId,
  seedLocalComposioConnection,
  summarizeAuthConfig,
  summarizeConnectedAccounts,
} from "./composio-connection-support.mjs";

const apiBaseUrl = "https://backend.composio.dev";
const localDatabaseUrl =
  "postgresql://lojaveiculosv2:lojaveiculosv2_dev@localhost:54321/lojaveiculosv2";

loadLocalEnv();

try {
  const { command, flags } = parseComposioArgs(process.argv.slice(2));
  if (command === "diagnose") await diagnose(flags);
  if (command === "link") await createLink(flags);
  if (command === "seed-local") await seedLocal(flags);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Composio command failed.",
  );
  process.exitCode = 1;
}

async function diagnose(flags) {
  const configuredChannels = ["whatsapp", "instagram"].flatMap((channel) => {
    try {
      return [{ authConfigId: resolveAuthConfigId(channel, flags), channel }];
    } catch {
      return [];
    }
  });
  if (!configuredChannels.length) {
    throw new Error(
      "Provide --whatsapp-auth-config and/or --instagram-auth-config with ac_ IDs.",
    );
  }
  const summary = [];
  for (const { authConfigId, channel } of configuredChannels) {
    const authConfig = await requestJson(
      `/api/v3.1/auth_configs/${encodeURIComponent(authConfigId)}`,
    );
    const query = new URLSearchParams({
      auth_config_ids: authConfigId,
      limit: "100",
    });
    const accounts = await requestJson(
      `/api/v3.1/connected_accounts?${query.toString()}`,
    );
    summary.push({
      ...summarizeAuthConfig(channel, authConfigId, authConfig),
      connectedAccounts: summarizeConnectedAccounts(accounts),
    });
  }
  console.info(JSON.stringify({ channels: summary }, null, 2));
  if (summary.every((item) => item.connectedAccounts.length === 0)) {
    console.info(
      "No connected account exists yet. Run crm:composio:link for one channel.",
    );
  }
}

async function createLink(flags) {
  const channel = requireChannel(flags);
  const authConfigId = resolveAuthConfigId(channel, flags);
  const payload = await requestJson("/api/v3.1/connected_accounts/link", {
    body: JSON.stringify({
      auth_config_id: authConfigId,
      ...(flags["callback-url"] ? { callback_url: flags["callback-url"] } : {}),
      user_id: flags["user-id"] ?? `lojaveiculosv2-local-test-store-${channel}`,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  console.info(
    JSON.stringify(
      {
        channel,
        connectedAccountId: payload.connected_account_id ?? null,
        expiresAt: payload.expires_at ?? null,
        redirectUrl: payload.redirect_url ?? null,
      },
      null,
      2,
    ),
  );
}

async function seedLocal(flags) {
  const channel = requireChannel(flags);
  const connection = buildSeedConnection(channel, flags);
  const account = await requestJson(
    `/api/v3.1/connected_accounts/${encodeURIComponent(
      connection.connectedAccountId,
    )}`,
  );
  const accountStatus = String(account.status ?? "").toUpperCase();
  const toolkit = String(account.toolkit?.slug ?? "");
  if (!["ACTIVE", "CONNECTED"].includes(accountStatus)) {
    throw new Error(
      "Connected account is not active; local seed was not changed.",
    );
  }
  if (toolkit && toolkit !== connection.toolkit) {
    throw new Error("Connected account toolkit does not match the channel.");
  }

  assertSafeLocalDatabaseOperation("crm:composio:seed:local", ["DATABASE_URL"]);
  const db = postgres(process.env.DATABASE_URL ?? localDatabaseUrl, { max: 1 });
  let seeded;
  try {
    seeded = await seedLocalComposioConnection(db, connection);
  } finally {
    await db.end({ timeout: 5 });
  }
  console.info(
    JSON.stringify(
      {
        channel,
        connectedAccountId: connection.connectedAccountId,
        connectionId: seeded.id,
        externalConnectionId: seeded.externalConnectionId,
        seeded: true,
        state: seeded.state,
      },
      null,
      2,
    ),
  );
}

function requireChannel(flags) {
  const channel = flags.channel;
  channelConfig(channel);
  return channel;
}

async function requestJson(path, init = {}) {
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey) throw new Error("COMPOSIO_API_KEY is required.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
        ...init.headers,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Composio request failed with HTTP ${response.status}.`);
    }
    return await response.json();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Composio request")
    ) {
      throw error;
    }
    throw new Error("Composio request failed before receiving a response.");
  } finally {
    clearTimeout(timeout);
  }
}
