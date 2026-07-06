import type { ServiceContext } from "../../../shared/serviceContext.js";
import { createLeadActivity } from "../../../domains/crm/services/CrmService/createLeadActivity.js";
import type { CreateLeadActivityInput } from "../../../domains/crm/services/CrmService/createLeadActivity.js";
import { changeLeadVisitStatus } from "../../../domains/crm/services/CrmService/changeLeadVisitStatus.js";
import { createCrmLead } from "../../../domains/crm/services/CrmService/createCrmLead.js";
import type { CreateCrmLeadInput } from "../../../domains/crm/services/CrmService/createCrmLead.js";
import { createCrmPipeline } from "../../../domains/crm/services/CrmService/createCrmPipeline.js";
import type { CreateCrmPipelineInput } from "../../../domains/crm/services/CrmService/createCrmPipeline.js";
import { createLeadVisit } from "../../../domains/crm/services/CrmService/createLeadVisit.js";
import { deleteCrmPipeline } from "../../../domains/crm/services/CrmService/deleteCrmPipeline.js";
import type { DeleteCrmPipelineInput } from "../../../domains/crm/services/CrmService/deleteCrmPipeline.js";
import { getCrmLead } from "../../../domains/crm/services/CrmService/getCrmLead.js";
import type { GetCrmLeadInput } from "../../../domains/crm/services/CrmService/getCrmLead.js";
import { listCrmLeads } from "../../../domains/crm/services/CrmService/listCrmLeads.js";
import type { ListCrmLeadsInput } from "../../../domains/crm/services/CrmService/listCrmLeads.js";
import { listCrmPipelines } from "../../../domains/crm/services/CrmService/listCrmPipelines.js";
import { listLeadActivities } from "../../../domains/crm/services/CrmService/listLeadActivities.js";
import type { ListLeadActivitiesInput } from "../../../domains/crm/services/CrmService/listLeadActivities.js";
import { listLeadVisits } from "../../../domains/crm/services/CrmService/listLeadVisits.js";
import { moveCrmLeadPipelineStage } from "../../../domains/crm/services/CrmService/moveCrmLeadPipelineStage.js";
import type { MoveCrmLeadPipelineStageInput } from "../../../domains/crm/services/CrmService/moveCrmLeadPipelineStage.js";
import { updateCrmPipeline } from "../../../domains/crm/services/CrmService/updateCrmPipeline.js";
import type { UpdateCrmPipelineInput } from "../../../domains/crm/services/CrmService/updateCrmPipeline.js";
import { updateCrmLead } from "../../../domains/crm/services/CrmService/updateCrmLead.js";
import type { UpdateCrmLeadInput } from "../../../domains/crm/services/CrmService/updateCrmLead.js";
import { updateLeadVisit } from "../../../domains/crm/services/CrmService/updateLeadVisit.js";
import type { CrmPipeline } from "../../../domains/crm/ports/crmPipelineRepository.js";
import type {
  CrmLead,
  CrmLeadActivity,
} from "../../../domains/crm/ports/crmRepository.js";
import type { CrmLeadVisit } from "../../../domains/crm/ports/crmVisitRepository.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createMemoryCrmBotIntegrationRepository } from "../adapters/memory/crmBotIntegrationRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmVisitRepository } from "../adapters/memory/crmVisitRepository.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createDrizzleCrmRepository,
  type DrizzleCrmClient,
} from "../../../infrastructure/db/crm/drizzleCrmRepository.js";
import { createDrizzleCrmBotIntegrationRepository } from "../../../infrastructure/db/crm/drizzleCrmBotIntegrationRepository.js";
import { createDrizzleCrmVisitRepository } from "../../../infrastructure/db/crm/drizzleCrmVisitRepository.js";
import { createDrizzleCrmPipelineRepository } from "../../../infrastructure/db/crm/drizzleCrmPipelineRepository.js";
import { createDrizzleCrmConnectionRepository } from "../../../infrastructure/db/crm/drizzleCrmConnectionRepository.js";
import { createDrizzleCrmWebhookEventRepository } from "../../../infrastructure/db/crm/drizzleCrmWebhookEventRepository.js";
import { createDrizzleCrmWhatsappRepository } from "../../../infrastructure/db/crm/drizzleCrmWhatsappRepository.js";
import {
  createDrizzleVehicleInventoryRepositories,
  type DrizzleVehicleInventoryClient,
} from "../../../infrastructure/db/vehicleInventory/drizzleVehicleInventoryRepository.js";
import {
  createCrmWhatsappServiceBindings,
  type CrmWhatsappServices,
} from "./crmWhatsappServiceBindings.js";

export type CrmServices = CrmWhatsappServices & {
  createActivity: (
    context: ServiceContext,
    input: CreateLeadActivityInput,
  ) => Promise<CrmLeadActivity>;
  createLead: (
    context: ServiceContext,
    input: CreateCrmLeadInput,
  ) => Promise<CrmLead>;
  createPipeline: (
    context: ServiceContext,
    input: CreateCrmPipelineInput,
  ) => Promise<CrmPipeline>;
  createVisit: (
    context: ServiceContext,
    input: Parameters<typeof createLeadVisit>[1],
  ) => Promise<CrmLeadVisit>;
  cancelVisit: (
    context: ServiceContext,
    input: { visitId: string },
  ) => Promise<CrmLeadVisit>;
  completeVisit: (
    context: ServiceContext,
    input: { visitId: string },
  ) => Promise<CrmLeadVisit>;
  deletePipeline: (
    context: ServiceContext,
    input: DeleteCrmPipelineInput,
  ) => Promise<{ deleted: true }>;
  getLead: (
    context: ServiceContext,
    input: GetCrmLeadInput,
  ) => Promise<CrmLead>;
  listActivities: (
    context: ServiceContext,
    input: ListLeadActivitiesInput,
  ) => Promise<readonly CrmLeadActivity[]>;
  listLeads: (
    context: ServiceContext,
    input: ListCrmLeadsInput,
  ) => Promise<readonly CrmLead[]>;
  listPipelines: (context: ServiceContext) => Promise<readonly CrmPipeline[]>;
  listVisits: (
    context: ServiceContext,
    input: Parameters<typeof listLeadVisits>[1],
  ) => Promise<readonly CrmLeadVisit[]>;
  moveLeadPipelineStage: (
    context: ServiceContext,
    input: MoveCrmLeadPipelineStageInput,
  ) => Promise<CrmLead>;
  updatePipeline: (
    context: ServiceContext,
    input: UpdateCrmPipelineInput,
  ) => Promise<CrmPipeline>;
  updateVisit: (
    context: ServiceContext,
    input: Parameters<typeof updateLeadVisit>[1],
  ) => Promise<CrmLeadVisit>;
  updateLead: (
    context: ServiceContext,
    input: UpdateCrmLeadInput,
  ) => Promise<CrmLead>;
};

export type CreateCrmServicesOptions = {
  drizzleClient?: DrizzleCrmClient;
  environment?: string;
  ports?: Partial<CrmServicePorts>;
};

export function createCrmServices(
  options: CreateCrmServicesOptions = {},
): CrmServices {
  const ports = resolveCrmPorts(options);

  return {
    createActivity: (context, input) =>
      createLeadActivity(context, input, ports),
    createLead: (context, input) => createCrmLead(context, input, ports),
    createPipeline: (context, input) =>
      createCrmPipeline(context, input, ports),
    createVisit: (context, input) => createLeadVisit(context, input, ports),
    cancelVisit: (context, input) =>
      changeLeadVisitStatus(context, { ...input, status: "cancelled" }, ports),
    completeVisit: (context, input) =>
      changeLeadVisitStatus(context, { ...input, status: "completed" }, ports),
    deletePipeline: (context, input) =>
      deleteCrmPipeline(context, input, ports),
    getLead: (context, input) => getCrmLead(context, input, ports),
    listActivities: (context, input) =>
      listLeadActivities(context, input, ports),
    listLeads: (context, input) => listCrmLeads(context, input, ports),
    listPipelines: (context) => listCrmPipelines(context, ports),
    listVisits: (context, input) => listLeadVisits(context, input, ports),
    moveLeadPipelineStage: (context, input) =>
      moveCrmLeadPipelineStage(context, input, ports),
    updatePipeline: (context, input) =>
      updateCrmPipeline(context, input, ports),
    updateVisit: (context, input) => updateLeadVisit(context, input, ports),
    updateLead: (context, input) => updateCrmLead(context, input, ports),
    ...createCrmWhatsappServiceBindings(ports),
  };
}

function resolveCrmPorts(options: CreateCrmServicesOptions): CrmServicePorts {
  const createVehicleInventory = (client: DrizzleCrmClient) => {
    const repositories = createDrizzleVehicleInventoryRepositories(
      client as unknown as DrizzleVehicleInventoryClient,
    );
    return {
      listingRepository: repositories.listingRepository,
      mediaRepository: repositories.mediaRepository,
      unitRepository: repositories.unitRepository,
    };
  };
  const defaultPorts = options.drizzleClient
    ? {
        crmBotIntegrationRepository: createDrizzleCrmBotIntegrationRepository(
          options.drizzleClient,
        ),
        crmConnectionRepository: createDrizzleCrmConnectionRepository(
          options.drizzleClient,
        ),
        crmPipelineRepository: createDrizzleCrmPipelineRepository(
          options.drizzleClient,
        ),
        crmRepository: createDrizzleCrmRepository(options.drizzleClient),
        crmVisitRepository: createDrizzleCrmVisitRepository(
          options.drizzleClient,
        ),
        crmWebhookEventRepository: createDrizzleCrmWebhookEventRepository(
          options.drizzleClient,
        ),
        crmWhatsappRepository: createDrizzleCrmWhatsappRepository(
          options.drizzleClient,
        ),
        environment: options.environment ?? "local",
        vehicleInventory: createVehicleInventory(options.drizzleClient),
      }
    : {
        crmBotIntegrationRepository: createMemoryCrmBotIntegrationRepository(),
        crmConnectionRepository: createMemoryCrmConnectionRepository(),
        crmPipelineRepository: createMemoryCrmPipelineRepository(),
        crmRepository: createMemoryCrmRepository(),
        crmVisitRepository: createMemoryCrmVisitRepository(),
        crmWebhookEventRepository: createMemoryCrmWebhookEventRepository(),
        crmWhatsappRepository: createMemoryCrmWhatsappRepository(),
        environment: options.environment ?? "test",
      };

  const ports = { ...defaultPorts, ...(options.ports ?? {}) };
  if (options.drizzleClient && !ports.transaction) {
    ports.transaction = async (action) =>
      options.drizzleClient!.transaction(async (tx) => {
        const { transaction: _transaction, ...transactionPorts } = ports;
        return action({
          ...transactionPorts,
          crmBotIntegrationRepository: createDrizzleCrmBotIntegrationRepository(
            tx as DrizzleCrmClient,
          ),
          crmConnectionRepository: createDrizzleCrmConnectionRepository(
            tx as DrizzleCrmClient,
          ),
          crmPipelineRepository: createDrizzleCrmPipelineRepository(
            tx as DrizzleCrmClient,
          ),
          crmRepository: createDrizzleCrmRepository(tx as DrizzleCrmClient),
          crmVisitRepository: createDrizzleCrmVisitRepository(
            tx as DrizzleCrmClient,
          ),
          crmWebhookEventRepository: createDrizzleCrmWebhookEventRepository(
            tx as DrizzleCrmClient,
          ),
          crmWhatsappRepository: createDrizzleCrmWhatsappRepository(
            tx as DrizzleCrmClient,
            { disableTransactions: true },
          ),
          vehicleInventory: createVehicleInventory(tx as DrizzleCrmClient),
        });
      });
  }

  return ports;
}

export const crmServices = createCrmServices();
