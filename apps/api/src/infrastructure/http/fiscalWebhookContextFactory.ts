import type { AuditSink } from "@lojaveiculosv2/audit";
import type { Context } from "hono";
import { createHttpIntegrationServiceContext } from "./httpIntegrationServiceContext.js";

export function createFiscalWebhookContextFactory(audit?: AuditSink) {
  return async (context: Context) =>
    createHttpIntegrationServiceContext(
      context,
      {
        actorId: "spedy",
        displayName: "Spedy",
        permissions: ["fiscal.webhook.ingest"],
      },
      { ...(audit ? { audit } : {}) },
    );
}
