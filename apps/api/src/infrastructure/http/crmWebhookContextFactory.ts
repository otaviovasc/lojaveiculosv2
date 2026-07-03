import type { AuditSink } from "@lojaveiculosv2/audit";
import type { Context } from "hono";
import { createHttpIntegrationServiceContext } from "./httpIntegrationServiceContext.js";

export function createCrmWebhookContextFactory(audit?: AuditSink) {
  return async (context: Context) =>
    createHttpIntegrationServiceContext(
      context,
      {
        actorId: "zapi",
        displayName: "ZAPI",
        permissions: ["crm.whatsapp.ingest"],
      },
      { ...(audit ? { audit } : {}) },
    );
}
