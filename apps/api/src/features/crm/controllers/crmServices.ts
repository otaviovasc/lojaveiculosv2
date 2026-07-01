import type { ServiceContext } from "../../../shared/serviceContext.js";
import { createLeadActivity } from "../../../domains/crm/services/CrmService/createLeadActivity.js";
import type { CreateLeadActivityInput } from "../../../domains/crm/services/CrmService/createLeadActivity.js";
import { createCrmLead } from "../../../domains/crm/services/CrmService/createCrmLead.js";
import type { CreateCrmLeadInput } from "../../../domains/crm/services/CrmService/createCrmLead.js";
import { getCrmLead } from "../../../domains/crm/services/CrmService/getCrmLead.js";
import type { GetCrmLeadInput } from "../../../domains/crm/services/CrmService/getCrmLead.js";
import { listCrmLeads } from "../../../domains/crm/services/CrmService/listCrmLeads.js";
import type { ListCrmLeadsInput } from "../../../domains/crm/services/CrmService/listCrmLeads.js";
import { listLeadActivities } from "../../../domains/crm/services/CrmService/listLeadActivities.js";
import type { ListLeadActivitiesInput } from "../../../domains/crm/services/CrmService/listLeadActivities.js";
import { updateCrmLead } from "../../../domains/crm/services/CrmService/updateCrmLead.js";
import type { UpdateCrmLeadInput } from "../../../domains/crm/services/CrmService/updateCrmLead.js";
import type {
  CrmLead,
  CrmLeadActivity,
} from "../../../domains/crm/ports/crmRepository.js";
import {
  createDisabledRepassesCrmClient,
  type RepassesCrmClient,
} from "../../../domains/crm/acl/repassesCrmClient.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import {
  createDrizzleCrmRepository,
  type DrizzleCrmClient,
} from "../../../infrastructure/db/crm/drizzleCrmRepository.js";

export type CrmServices = {
  createActivity: (
    context: ServiceContext,
    input: CreateLeadActivityInput,
  ) => Promise<CrmLeadActivity>;
  createLead: (
    context: ServiceContext,
    input: CreateCrmLeadInput,
  ) => Promise<CrmLead>;
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
  repassesCrm: RepassesCrmClient;
  updateLead: (
    context: ServiceContext,
    input: UpdateCrmLeadInput,
  ) => Promise<CrmLead>;
};

export type CreateCrmServicesOptions =
  | {
      drizzleClient?: never;
      ports?: CrmServicePorts;
      repassesCrmClient?: RepassesCrmClient;
    }
  | {
      drizzleClient: DrizzleCrmClient;
      ports?: never;
      repassesCrmClient?: RepassesCrmClient;
    };

export function createCrmServices(
  options: CreateCrmServicesOptions = {},
): CrmServices {
  const ports = resolveCrmPorts(options);

  return {
    createActivity: (context, input) =>
      createLeadActivity(context, input, ports),
    createLead: (context, input) => createCrmLead(context, input, ports),
    getLead: (context, input) => getCrmLead(context, input, ports),
    listActivities: (context, input) =>
      listLeadActivities(context, input, ports),
    listLeads: (context, input) => listCrmLeads(context, input, ports),
    repassesCrm: options.repassesCrmClient ?? createDisabledRepassesCrmClient(),
    updateLead: (context, input) => updateCrmLead(context, input, ports),
  };
}

function resolveCrmPorts(options: CreateCrmServicesOptions): CrmServicePorts {
  if ("ports" in options && options.ports) return options.ports;

  if ("drizzleClient" in options) {
    return { crmRepository: createDrizzleCrmRepository(options.drizzleClient) };
  }

  return { crmRepository: createMemoryCrmRepository() };
}

export const crmServices = createCrmServices();
