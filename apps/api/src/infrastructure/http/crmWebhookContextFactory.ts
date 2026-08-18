import type { AuditSink } from "@lojaveiculosv2/audit";
import type { Context } from "hono";
import { createHttpIntegrationServiceContext } from "./httpIntegrationServiceContext.js";

export function createCrmWebhookContextFactory(audit?: AuditSink) {
  return async (context: Context) => {
    const actor = resolveCrmWebhookActor(new URL(context.req.url).pathname);
    return createHttpIntegrationServiceContext(
      context,
      {
        ...actor,
        permissions: ["crm.whatsapp.ingest"],
      },
      { ...(audit ? { audit } : {}) },
    );
  };
}

export function resolveCrmWebhookActor(pathname: string) {
  if (
    pathname.endsWith("/crm/bot/actions") ||
    pathname.endsWith("/crm/whatsapp/integrations/bot/actions")
  ) {
    return { actorId: "external_crm_bot", displayName: "External CRM bot" };
  }
  if (pathname.endsWith("/crm/webhooks/meta")) {
    return { actorId: "meta", displayName: "Meta" };
  }
  if (pathname.includes("/whatsapp/webhooks/zapi/")) {
    return { actorId: "zapi", displayName: "Z-API" };
  }
  if (pathname.includes("/whatsapp/webhooks/olx/")) {
    return { actorId: "olx_chat", displayName: "OLX Chat" };
  }
  throw new Error("Unknown CRM webhook provider path.");
}
