import type { Context } from "hono";
import { CrmWhatsappValidationError } from "./crm.whatsapp.errors.js";

export function readWebhookRequestBase(context: Context): {
  basePath: string;
  canonicalApiOrigin: string;
} {
  const requestUrl = new URL(context.req.url);
  return {
    basePath: requestUrl.pathname.replace(
      /\/whatsapp\/(?:support\/zapi\/)?connections.*$/,
      "",
    ),
    canonicalApiOrigin: readCanonicalApiOrigin(requestUrl),
  };
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
      throw new CrmWhatsappValidationError(
        "API_BASE_URL must be a valid public HTTPS URL.",
      );
    }
  }
  if (isLocalRuntime()) return requestUrl.origin;
  throw new CrmWhatsappValidationError(
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
