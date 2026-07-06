import type { ServiceContext } from "../../../shared/serviceContext.js";
import { createLeadActivity } from "../../../domains/crm/services/CrmService/createLeadActivity.js";
import type { CreateLeadActivityInput } from "../../../domains/crm/services/CrmService/createLeadActivity.js";
import { createCrmLead } from "../../../domains/crm/services/CrmService/createCrmLead.js";
import type { CreateCrmLeadInput } from "../../../domains/crm/services/CrmService/createCrmLead.js";
import { createCrmPipeline } from "../../../domains/crm/services/CrmService/createCrmPipeline.js";
import type { CreateCrmPipelineInput } from "../../../domains/crm/services/CrmService/createCrmPipeline.js";
import { deleteCrmPipeline } from "../../../domains/crm/services/CrmService/deleteCrmPipeline.js";
import type { DeleteCrmPipelineInput } from "../../../domains/crm/services/CrmService/deleteCrmPipeline.js";
import { getCrmLead } from "../../../domains/crm/services/CrmService/getCrmLead.js";
import type { GetCrmLeadInput } from "../../../domains/crm/services/CrmService/getCrmLead.js";
import { listCrmLeads } from "../../../domains/crm/services/CrmService/listCrmLeads.js";
import type { ListCrmLeadsInput } from "../../../domains/crm/services/CrmService/listCrmLeads.js";
import { listCrmPipelines } from "../../../domains/crm/services/CrmService/listCrmPipelines.js";
import { listLeadActivities } from "../../../domains/crm/services/CrmService/listLeadActivities.js";
import type { ListLeadActivitiesInput } from "../../../domains/crm/services/CrmService/listLeadActivities.js";
import { moveCrmLeadPipelineStage } from "../../../domains/crm/services/CrmService/moveCrmLeadPipelineStage.js";
import type { MoveCrmLeadPipelineStageInput } from "../../../domains/crm/services/CrmService/moveCrmLeadPipelineStage.js";
import { updateCrmPipeline } from "../../../domains/crm/services/CrmService/updateCrmPipeline.js";
import type { UpdateCrmPipelineInput } from "../../../domains/crm/services/CrmService/updateCrmPipeline.js";
import { updateCrmLead } from "../../../domains/crm/services/CrmService/updateCrmLead.js";
import type { UpdateCrmLeadInput } from "../../../domains/crm/services/CrmService/updateCrmLead.js";
import type { CrmPipeline } from "../../../domains/crm/ports/crmPipelineRepository.js";
import type {
  CrmLead,
  CrmLeadActivity,
} from "../../../domains/crm/ports/crmRepository.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  createDrizzleCrmRepository,
  type DrizzleCrmClient,
} from "../../../infrastructure/db/crm/drizzleCrmRepository.js";
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
  moveLeadPipelineStage: (
    context: ServiceContext,
    input: MoveCrmLeadPipelineStageInput,
  ) => Promise<CrmLead>;
  updatePipeline: (
    context: ServiceContext,
    input: UpdateCrmPipelineInput,
  ) => Promise<CrmPipeline>;
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
    deletePipeline: (context, input) =>
      deleteCrmPipeline(context, input, ports),
    getLead: (context, input) => getCrmLead(context, input, ports),
    listActivities: (context, input) =>
      listLeadActivities(context, input, ports),
    listLeads: (context, input) => listCrmLeads(context, input, ports),
    listPipelines: (context) => listCrmPipelines(context, ports),
    moveLeadPipelineStage: (context, input) =>
      moveCrmLeadPipelineStage(context, input, ports),
    updatePipeline: (context, input) =>
      updateCrmPipeline(context, input, ports),
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
        crmConnectionRepository: createDrizzleCrmConnectionRepository(
          options.drizzleClient,
        ),
        crmPipelineRepository: createDrizzleCrmPipelineRepository(
          options.drizzleClient,
        ),
        crmRepository: createDrizzleCrmRepository(options.drizzleClient),
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
        crmConnectionRepository: createMemoryCrmConnectionRepository(),
        crmPipelineRepository: createMemoryCrmPipelineRepository(),
        crmRepository: createMemoryCrmRepository(),
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
          crmConnectionRepository: createDrizzleCrmConnectionRepository(
            tx as DrizzleCrmClient,
          ),
          crmPipelineRepository: createDrizzleCrmPipelineRepository(
            tx as DrizzleCrmClient,
          ),
          crmRepository: createDrizzleCrmRepository(tx as DrizzleCrmClient),
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
