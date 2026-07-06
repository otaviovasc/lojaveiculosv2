import type { AuditSink } from "@lojaveiculosv2/audit";
import type { Context } from "hono";
import { createHttpIntegrationServiceContext } from "./httpIntegrationServiceContext.js";

export function createBillingWebhookContextFactory(audit?: AuditSink) {
  return async (context: Context) =>
    createHttpIntegrationServiceContext(
      context,
      {
        actorId: "asaas",
        displayName: "Asaas",
        permissions: ["billing.webhook.ingest"],
      },
      { ...(audit ? { audit } : {}) },
    );
}
