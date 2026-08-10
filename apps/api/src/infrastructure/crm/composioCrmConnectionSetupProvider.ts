import {
  CrmConnectionSetupProviderError,
  type ComposioWhatsappOnboardingProvider,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import { DEFAULT_COMPOSIO_API_BASE_URL } from "./composioCrmWhatsappGatewaySupport.js";
import {
  createComposioSetupClient,
  executeComposioSetupTool,
} from "./composioCrmConnectionSetupClient.js";
import {
  configurationError,
  normalizeAccountStatus,
  readBusinessAccounts,
  readPhones,
  readString,
  readTimeoutMs,
  requireAccountId,
  requireValue,
} from "./composioCrmConnectionSetupSupport.js";

const DEFAULT_TOOLKIT_VERSION = "20260721_00";
const OWNED_ACCOUNTS_TOOL = "WHATSAPP_GET_OWNED_BUSINESS_ACCOUNTS";
const PHONE_NUMBERS_TOOL = "WHATSAPP_GET_PHONE_NUMBERS";
const SUBSCRIBE_APP_TOOL = "WHATSAPP_SUBSCRIBE_APP";

function invalidResponse(message: string) {
  return new CrmConnectionSetupProviderError(
    message,
    "invalid_provider_response",
  );
}

export function createComposioCrmConnectionSetupProvider(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): ComposioWhatsappOnboardingProvider {
  const apiKey = requireValue(env.COMPOSIO_API_KEY ?? "", "Composio API key");
  const authConfigId = requireValue(
    env.COMPOSIO_WHATSAPP_AUTH_CONFIG_ID ?? "",
    "Composio WhatsApp auth config",
  );
  if (!authConfigId.startsWith("ac_")) {
    throw configurationError("Composio WhatsApp auth config ID is invalid");
  }
  const baseUrl =
    env.COMPOSIO_API_BASE_URL?.trim().replace(/\/+$/u, "") ||
    DEFAULT_COMPOSIO_API_BASE_URL;
  assertHttpsProviderUrl(baseUrl, "Composio API base URL");
  const client = createComposioSetupClient(
    baseUrl,
    apiKey,
    readTimeoutMs(env.COMPOSIO_REQUEST_TIMEOUT_MS),
    fetchImpl,
  );
  const toolkitVersion =
    env.COMPOSIO_WHATSAPP_TOOLKIT_VERSION?.trim() || DEFAULT_TOOLKIT_VERSION;

  return {
    async createConnectLink(input) {
      const callbackUrl = input.callbackUrl ?? readPublicAppUrl(env);
      const payload = await client.request(
        "/api/v3.1/connected_accounts/link",
        {
          body: JSON.stringify({
            ...(input.alias ? { alias: input.alias } : {}),
            auth_config_id: authConfigId,
            ...(callbackUrl ? { callback_url: callbackUrl } : {}),
            user_id: requireValue(input.userId, "Composio user ID"),
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const connectedAccountId = readString(payload.connected_account_id);
      const expiresAt = readString(payload.expires_at);
      const redirectUrl = readString(payload.redirect_url);
      if (!connectedAccountId || !expiresAt || !redirectUrl) {
        throw invalidResponse("Composio returned an invalid Connect Link");
      }
      assertTrustedComposioRedirect(redirectUrl);
      return { connectedAccountId, expiresAt, redirectUrl };
    },
    async discoverWhatsappResources(connectedAccountId) {
      const accountId = requireAccountId(connectedAccountId);
      const accountPayload = await executeComposioSetupTool(
        client,
        accountId,
        OWNED_ACCOUNTS_TOOL,
        {},
        toolkitVersion,
      );
      const businessAccounts = readBusinessAccounts(accountPayload);
      const phones = (
        await Promise.all(
          businessAccounts.map(async (account) =>
            readPhones(
              await executeComposioSetupTool(
                client,
                accountId,
                PHONE_NUMBERS_TOOL,
                { business_account_id: account.id },
                toolkitVersion,
              ),
              account.id,
            ),
          ),
        )
      ).flat();
      return { businessAccounts, phones };
    },
    async subscribeWhatsappApp(input) {
      await executeComposioSetupTool(
        client,
        requireAccountId(input.connectedAccountId),
        SUBSCRIBE_APP_TOOL,
        {
          business_account_id: requireValue(input.businessAccountId, "WABA ID"),
        },
        toolkitVersion,
      );
      return { subscribed: true };
    },
    async verifyConnectedAccount(connectedAccountId) {
      const accountId = requireAccountId(connectedAccountId);
      const payload = await client.request(
        `/api/v3.1/connected_accounts/${encodeURIComponent(accountId)}`,
      );
      const rawStatus = readString(payload.status)?.toLowerCase();
      if (!rawStatus) {
        throw invalidResponse(
          "Composio returned an invalid connected-account status",
        );
      }
      return {
        connectedAccountId: readString(payload.id) ?? accountId,
        status: normalizeAccountStatus(rawStatus),
        statusReason: readString(payload.status_reason),
        toolkit:
          payload.toolkit &&
          typeof payload.toolkit === "object" &&
          !Array.isArray(payload.toolkit)
            ? readString((payload.toolkit as Record<string, unknown>).slug)
            : null,
      };
    },
  };
}

function readPublicAppUrl(env: Record<string, string | undefined>) {
  const value = env.PUBLIC_APP_URL?.trim();
  if (!value) return undefined;
  assertHttpsProviderUrl(value, "Public app callback URL");
  const callback = new URL(value);
  callback.hash = "/crm?surface=whatsapp";
  return callback.toString();
}

function assertHttpsProviderUrl(value: string, label: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password) return;
  } catch {
    // Mapped to the stable setup configuration error below.
  }
  throw new CrmConnectionSetupProviderError(
    `${label} must be an HTTPS URL without embedded credentials`,
    "configuration_error",
  );
}

function assertTrustedComposioRedirect(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      (url.hostname === "composio.dev" ||
        url.hostname.endsWith(".composio.dev"))
    ) {
      return;
    }
  } catch {
    // Mapped to the stable provider response error below.
  }
  throw invalidResponse("Composio returned an untrusted authorization URL");
}
