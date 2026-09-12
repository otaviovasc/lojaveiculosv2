import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { ZapiWebhookSetupState } from "../../whatsapp/zapiWebhookSetupState.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";

export function logZapiWebhookSetup(
  context: ServiceContext,
  phase: "completed" | "failed" | "started",
  connectionId: string,
  setup: ZapiWebhookSetupState,
  startedAt: number,
) {
  logCrmServiceEvent(context, `crm.provider.zapi.webhooks.${phase}`, {
    attemptCount: setup.attemptCount,
    connectionId,
    durationMs: Math.max(0, Date.now() - startedAt),
    errorCode: setup.lastErrorCode,
    operation: "configure_webhooks",
    provider: "zapi",
    setupStatus: setup.status,
    succeededCount: setup.succeededTypes.length,
    supportCode: setup.supportCode,
  });
}

export async function auditZapiWebhookSetupResult(
  context: ServiceContext,
  connectionId: string,
  setup: ZapiWebhookSetupState,
) {
  await auditCrmServiceEvent(
    context,
    {
      action: "crm.provider.zapi.connection.setup.result",
      category: "data_change",
      entityId: connectionId,
      entityType: "crm_channel_connection",
      failureTier: "required",
      metadata: {
        attemptCount: setup.attemptCount,
        errorCode: setup.lastErrorCode,
        setupStatus: setup.status,
        succeededCount: setup.succeededTypes.length,
        supportCode: setup.supportCode,
      },
      permission: "crm.messaging.connection.setup",
      summary: "Processed Z-API webhook setup intent",
    },
    setup.status === "configured" ? "succeeded" : "failed",
  );
}
