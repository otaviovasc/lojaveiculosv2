import {
  composioInstagramWebhookFields,
  CrmConnectionSetupProviderError,
  type ComposioInstagramLoginMode,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import {
  executeComposioSetupProxy,
  type ComposioSetupClient,
} from "./composioCrmConnectionSetupClient.js";
import {
  assertMetaSubscriptionSucceeded,
  configurationError,
  readFacebookInstagramSenders,
  readInstagramLoginSender,
  readRecord,
  readString,
  requireAccountId,
  requireValue,
} from "./composioCrmConnectionSetupSupport.js";

const FACEBOOK_GRAPH_HOST = "https://graph.facebook.com";
const INSTAGRAM_GRAPH_HOST = "https://graph.instagram.com";

export function readInstagramLoginMode(
  env: Record<string, string | undefined>,
): ComposioInstagramLoginMode {
  const mode = env.COMPOSIO_INSTAGRAM_LOGIN_MODE?.trim().toLowerCase();
  if (mode === "facebook" || mode === "instagram") return mode;
  throw configurationError(
    "COMPOSIO_INSTAGRAM_LOGIN_MODE must be configured as facebook or instagram",
  );
}

export function createComposioInstagramSetup(input: {
  client: ComposioSetupClient;
  env: Record<string, string | undefined>;
}) {
  const discover = async (connectedAccountId: string) => {
    const mode = readInstagramLoginMode(input.env);
    const accountId = requireAccountId(connectedAccountId);
    const graphVersion = readGraphVersion(input.env);
    if (mode === "facebook") {
      const payload = await executeComposioSetupProxy(input.client, {
        connectedAccountId: accountId,
        endpoint: `${FACEBOOK_GRAPH_HOST}/${graphVersion}/me/accounts`,
        method: "GET",
        parameters: [
          {
            in: "query",
            name: "fields",
            value: "name,tasks,instagram_business_account{id,name,username}",
          },
        ],
      });
      return { senders: readFacebookInstagramSenders(payload) };
    }
    const payload = await executeComposioSetupProxy(input.client, {
      connectedAccountId: accountId,
      endpoint: `${INSTAGRAM_GRAPH_HOST}/${graphVersion}/me`,
      method: "GET",
      parameters: [{ in: "query", name: "fields", value: "user_id,username" }],
    });
    return { senders: readInstagramLoginSender(payload) };
  };
  return {
    discover,
    async subscribe(subscription: {
      connectedAccountId: string;
      senderId: string;
      subscriptionTargetId: string;
    }) {
      const mode = readInstagramLoginMode(input.env);
      const accountId = requireAccountId(subscription.connectedAccountId);
      const targetId = requireAccountId(subscription.subscriptionTargetId);
      const senderId = requireAccountId(subscription.senderId);
      await assertSubscriptionTarget(
        mode,
        senderId,
        targetId,
        accountId,
        discover,
      );
      const fields = composioInstagramWebhookFields[mode];
      const host =
        mode === "facebook" ? FACEBOOK_GRAPH_HOST : INSTAGRAM_GRAPH_HOST;
      const pageAccessToken =
        mode === "facebook"
          ? await readFacebookPageAccessToken(
              input.client,
              accountId,
              readGraphVersion(input.env),
              targetId,
              senderId,
            )
          : null;
      const payload = await executeComposioSetupProxy(input.client, {
        connectedAccountId: accountId,
        endpoint: `${host}/${readGraphVersion(input.env)}/${encodeURIComponent(targetId)}/subscribed_apps`,
        method: "POST",
        parameters: [
          {
            in: "query",
            name: "subscribed_fields",
            value: fields.join(","),
          },
          ...(pageAccessToken
            ? [
                {
                  in: "query" as const,
                  name: "access_token",
                  value: pageAccessToken,
                },
              ]
            : []),
        ],
      });
      assertMetaSubscriptionSucceeded(payload);
      return { fields, subscribed: true as const, targetId };
    },
  };
}

async function readFacebookPageAccessToken(
  client: ComposioSetupClient,
  connectedAccountId: string,
  graphVersion: string,
  pageId: string,
  senderId: string,
) {
  const payload = await executeComposioSetupProxy(client, {
    connectedAccountId,
    endpoint: `${FACEBOOK_GRAPH_HOST}/${graphVersion}/${encodeURIComponent(pageId)}`,
    method: "GET",
    parameters: [
      {
        in: "query",
        name: "fields",
        value: "access_token,instagram_business_account{id}",
      },
    ],
  });
  const record = readRecord(payload);
  const linkedAccount = readRecord(record.instagram_business_account);
  const accessToken = readString(record.access_token);
  if (readString(linkedAccount.id) !== senderId || !accessToken) {
    throw new CrmConnectionSetupProviderError(
      "Meta did not return a Page access token for the selected Instagram account",
      "invalid_provider_response",
    );
  }
  return accessToken;
}

async function assertSubscriptionTarget(
  mode: ComposioInstagramLoginMode,
  senderId: string,
  targetId: string,
  connectedAccountId: string,
  discover: (connectedAccountId: string) => Promise<{
    senders: readonly { senderId: string; subscriptionTargetId: string }[];
  }>,
) {
  if (mode === "instagram" && senderId !== targetId) {
    throw invalidSubscriptionTarget();
  }
  const resources = await discover(connectedAccountId);
  if (
    !resources.senders.some(
      (sender) =>
        sender.senderId === senderId &&
        sender.subscriptionTargetId === targetId,
    )
  ) {
    throw invalidSubscriptionTarget();
  }
}

function readGraphVersion(env: Record<string, string | undefined>) {
  const version = requireValue(
    env.COMPOSIO_META_GRAPH_VERSION ?? "",
    "Composio Meta Graph version",
  );
  if (!/^v\d+\.\d+$/u.test(version)) {
    throw configurationError("Composio Meta Graph version is invalid");
  }
  return version;
}

function invalidSubscriptionTarget() {
  return new CrmConnectionSetupProviderError(
    "The Instagram webhook subscription target does not match the selected account",
    "provider_rejected",
  );
}
