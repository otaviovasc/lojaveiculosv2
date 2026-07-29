import type { AuditSink } from "@lojaveiculosv2/audit";
import type { Context } from "hono";
import { createHttpIntegrationServiceContext } from "./httpIntegrationServiceContext.js";

export function createCrmWebhookContextFactory(audit?: AuditSink) {
  return async (context: Context) => {
    const meta = new URL(context.req.url).pathname.endsWith(
      "/whatsapp/webhooks/meta",
    );
    return createHttpIntegrationServiceContext(
      context,
      {
        actorId: meta ? "meta" : "zapi",
        displayName: meta ? "Meta" : "ZAPI",
        permissions: ["crm.whatsapp.ingest"],
      },
      { ...(audit ? { audit } : {}) },
    );
  };
}
