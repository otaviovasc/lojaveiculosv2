export function buildOlxChatCallbackUrl(input: {
  allowLocalHttp: boolean;
  canonicalApiOrigin: string;
  connectionId: string;
  storedWebhookUrl: string;
  webhookSecret: string;
}) {
  const callback = readTrustedOlxCallback(input);
  callback.searchParams.set("token", input.webhookSecret);
  return callback.toString();
}

function readTrustedOlxCallback(input: {
  allowLocalHttp: boolean;
  canonicalApiOrigin: string;
  connectionId: string;
  storedWebhookUrl: string;
}) {
  let canonical: URL, stored: URL;
  try {
    canonical = new URL(input.canonicalApiOrigin);
    stored = new URL(input.storedWebhookUrl);
  } catch {
    throw new OlxChatSetupRetryTargetError("credentials_unavailable");
  }
  const localHttp =
    input.allowLocalHttp &&
    canonical.protocol === "http:" &&
    canonical.hostname === "localhost";
  const publicHttps = canonical.protocol === "https:" && !canonical.port;
  const expectedPath = `/api/v1/crm/webhooks/olx/${input.connectionId}/received`;
  if (
    (!publicHttps && !localHttp) ||
    canonical.username ||
    canonical.password ||
    !["", "/"].includes(canonical.pathname) ||
    canonical.search ||
    canonical.hash ||
    stored.origin !== canonical.origin ||
    stored.username ||
    stored.password ||
    stored.pathname !== expectedPath ||
    stored.search ||
    stored.hash
  ) {
    throw new OlxChatSetupRetryTargetError("credentials_unavailable");
  }
  return new URL(expectedPath, canonical.origin);
}

export class OlxChatSetupRetryTargetError extends Error {
  constructor(
    readonly reason:
      | "already_configured"
      | "credentials_unavailable"
      | "not_found"
      | "wrong_provider",
  ) {
    super(
      reason === "not_found"
        ? "OLX Chat connection was not found."
        : reason === "wrong_provider"
          ? "Connection is not an OLX Chat connection."
          : reason === "already_configured"
            ? "OLX Chat setup is already configured."
            : "OLX Chat authorization is unavailable.",
    );
    this.name = "OlxChatSetupRetryTargetError";
  }
}
