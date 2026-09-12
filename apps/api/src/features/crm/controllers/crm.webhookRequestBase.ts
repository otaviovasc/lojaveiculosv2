import type { Context } from "hono";
import { CrmMessagingValidationError } from "./crm.messaging.errors.js";

export function readWebhookRequestBase(context: Context): {
  basePath: string;
  canonicalApiOrigin: string;
} {
  const requestUrl = new URL(context.req.url);
  return {
    basePath: readCrmApiBasePath(requestUrl.pathname),
    canonicalApiOrigin: readCanonicalApiOrigin(requestUrl),
  };
}

function readCrmApiBasePath(pathname: string): string {
  for (const marker of [
    "/channel-connections",
    "/whatsapp/webhooks/",
    "/webhooks/",
  ] as const) {
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex >= 0) return pathname.slice(0, markerIndex);
  }

  const segments = pathname.split("/");
  const crmSegmentIndex = segments.lastIndexOf("crm");
  if (crmSegmentIndex < 0) {
    throw new CrmMessagingValidationError(
      "CRM API base path could not be derived from the request route.",
    );
  }
  return segments.slice(0, crmSegmentIndex + 1).join("/");
}

function readCanonicalApiOrigin(requestUrl: URL): string {
  const configuredBaseUrl = process.env.API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    try {
      const configuredUrl = new URL(configuredBaseUrl);
      if (
        configuredUrl.username ||
        configuredUrl.password ||
        (configuredUrl.protocol !== "https:" && !isLocalRuntime())
      ) {
        throw new Error("unsafe API base URL");
      }
      return configuredUrl.origin;
    } catch {
      throw new CrmMessagingValidationError(
        "API_BASE_URL must be a valid public HTTPS URL.",
      );
    }
  }
  if (isLocalRuntime()) return requestUrl.origin;
  throw new CrmMessagingValidationError(
    "API_BASE_URL is required before configuring provider webhooks.",
  );
}

function isLocalRuntime() {
  const environment = (
    process.env.APP_ENV ??
    process.env.NODE_ENV ??
    ""
  ).toLowerCase();
  return ["development", "local", "test"].includes(environment);
}
