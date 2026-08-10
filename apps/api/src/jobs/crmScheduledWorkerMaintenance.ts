import type { ServiceContext } from "../shared/serviceContext.js";
import type { CrmServices } from "../features/crm/controllers/crmServices.js";

export async function runCrmScheduledWorkerMaintenance(
  services: Pick<CrmServices, "archiveAbandonedZapiConnections">,
  context: ServiceContext,
  input: { limit: number },
) {
  try {
    return await services.archiveAbandonedZapiConnections(context, input);
  } catch (error) {
    context.logger.warn("crm.schedule.maintenance.failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      operation: "cleanup_abandoned_connections_and_recovery_payloads",
    });
    return { archived: 0, recoveryPayloadsPurged: 0 };
  }
}
