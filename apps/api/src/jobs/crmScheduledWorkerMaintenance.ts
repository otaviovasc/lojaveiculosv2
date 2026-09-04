import type { ServiceContext } from "../shared/serviceContext.js";
import type { CrmServices } from "../features/crm/controllers/crmServices.js";

export async function runCrmScheduledWorkerMaintenance(
  services: Pick<
    CrmServices,
    | "archiveAbandonedZapiConnections"
    | "recoverOlxLeadWebhooks"
    | "recoverOlxWebhookEffects"
  >,
  context: ServiceContext,
  input: { limit: number },
) {
  const cleanup = await services
    .archiveAbandonedZapiConnections(context, input)
    .catch((error: unknown) => {
      context.logger.warn("crm.schedule.maintenance.failed", {
        errorName: error instanceof Error ? error.name : "UnknownError",
        operation: "cleanup_abandoned_connections_and_recovery_payloads",
      });
      return { archived: 0, recoveryPayloadsPurged: 0 };
    });
  const olxEffects = await services
    .recoverOlxWebhookEffects(context, input)
    .catch((error: unknown) => {
      context.logger.warn("crm.olx.webhook_effect_recovery.failed", {
        errorName: error instanceof Error ? error.name : "UnknownError",
        operation: "recover_durable_webhook_effects",
      });
      return {
        claimed: 0,
        completedEvents: 0,
        deadLettered: 0,
        delivered: 0,
        failed: 0,
      };
    });
  const olxLeads = await services
    .recoverOlxLeadWebhooks(context, input)
    .catch((error: unknown) => {
      context.logger.warn("crm.olx.lead_recovery.failed", {
        errorName: error instanceof Error ? error.name : "UnknownError",
        operation: "recover_durable_lead_receipts",
      });
      return { claimed: 0, failed: 0, processed: 0 };
    });
  return { ...cleanup, olxEffects, olxLeads };
}
