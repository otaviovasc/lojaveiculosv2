import { CrmMessageActionError } from "../messaging/crmMessagingErrors.js";

export function assertTrustedZapiWebhookDestination(
  webhookUrl: string | null,
  canonicalApiOrigin: string,
) {
  if (!webhookUrl) return;
  try {
    if (new URL(webhookUrl).origin === new URL(canonicalApiOrigin).origin)
      return;
  } catch {
    // Invalid URLs are rejected by the stable error below.
  }
  throw new CrmMessageActionError(
    "A custom webhook origin cannot receive connection authentication.",
    409,
  );
}
