import type { ServiceContext } from "../../../shared/serviceContext.js";
import { createLeadActivity } from "../../../domains/crm/services/CrmService/createLeadActivity.js";
import type { CreateLeadActivityInput } from "../../../domains/crm/services/CrmService/createLeadActivity.js";
import { changeLeadVisitStatus } from "../../../domains/crm/services/CrmService/changeLeadVisitStatus.js";
import {
  concludeWhatsappAttendance,
  type ConcludeWhatsappAttendanceInput,
  type ConcludeWhatsappAttendanceResult,
} from "../../../domains/crm/services/CrmService/concludeWhatsappAttendance.js";
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
import type {
  ListCrmLeadsInput,
  ListCrmLeadsResult,
} from "../../../domains/crm/services/CrmService/listCrmLeads.js";
import { listCrmLeadBoard } from "../../../domains/crm/services/CrmService/listCrmLeadBoard.js";
import { listCrmPipelines } from "../../../domains/crm/services/CrmService/listCrmPipelines.js";
import { listLeadActivities } from "../../../domains/crm/services/CrmService/listLeadActivities.js";
import type { ListLeadActivitiesInput } from "../../../domains/crm/services/CrmService/listLeadActivities.js";
import { listLeadVisits } from "../../../domains/crm/services/CrmService/listLeadVisits.js";
import { moveCrmLeadPipelineStage } from "../../../domains/crm/services/CrmService/moveCrmLeadPipelineStage.js";
import type { MoveCrmLeadPipelineStageInput } from "../../../domains/crm/services/CrmService/moveCrmLeadPipelineStage.js";
import { updateCrmPipeline } from "../../../domains/crm/services/CrmService/updateCrmPipeline.js";
import type { UpdateCrmPipelineInput } from "../../../domains/crm/services/CrmService/updateCrmPipeline.js";
import { updateCrmLead } from "../../../domains/crm/services/CrmService/updateCrmLead.js";
import { setCrmLeadArchived } from "../../../domains/crm/services/CrmService/setCrmLeadArchived.js";
import type { UpdateCrmLeadInput } from "../../../domains/crm/services/CrmService/updateCrmLead.js";
import { updateLeadVisit } from "../../../domains/crm/services/CrmService/updateLeadVisit.js";
import type { CrmPipeline } from "../../../domains/crm/ports/crmPipelineRepository.js";
import type {
  CrmLead,
  CrmLeadActivity,
} from "../../../domains/crm/ports/crmRepository.js";
import type { CrmLeadVisit } from "../../../domains/crm/ports/crmVisitRepository.js";
import {
  createCrmWhatsappServiceBindings,
  type CrmWhatsappServices,
} from "./crmWhatsappServiceBindings.js";
import { resolveCrmPorts } from "./crmServicePorts.js";
import type { CreateCrmServicesOptions } from "./crmServices.types.js";
export type { CreateCrmServicesOptions } from "./crmServices.types.js";
export type CrmServices = CrmWhatsappServices & {
  archiveLead: (
    context: ServiceContext,
    input: { leadId: string },
  ) => Promise<CrmLead>;
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
  concludeWhatsappAttendance: (
    context: ServiceContext,
    input: ConcludeWhatsappAttendanceInput,
  ) => Promise<ConcludeWhatsappAttendanceResult>;
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
  listLeadBoard: (
    context: ServiceContext,
    input: Parameters<typeof listCrmLeadBoard>[1],
  ) => ReturnType<typeof listCrmLeadBoard>;
  listLeads: (
    context: ServiceContext,
    input: ListCrmLeadsInput,
  ) => Promise<ListCrmLeadsResult>;
  listPipelines: (context: ServiceContext) => Promise<readonly CrmPipeline[]>;
  listVisits: (
    context: ServiceContext,
    input: Parameters<typeof listLeadVisits>[1],
  ) => Promise<readonly CrmLeadVisit[]>;
  moveLeadPipelineStage: (
    context: ServiceContext,
    input: MoveCrmLeadPipelineStageInput,
  ) => Promise<CrmLead>;
  restoreLead: (
    context: ServiceContext,
    input: { leadId: string },
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
export function createCrmServices(
  options: CreateCrmServicesOptions = {},
): CrmServices {
  const ports = resolveCrmPorts(options);
  return {
    archiveLead: (context, input) =>
      setCrmLeadArchived(context, { ...input, archived: true }, ports),
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
    concludeWhatsappAttendance: (context, input) =>
      concludeWhatsappAttendance(context, input, ports),
    deletePipeline: (context, input) =>
      deleteCrmPipeline(context, input, ports),
    getLead: (context, input) => getCrmLead(context, input, ports),
    listActivities: (context, input) =>
      listLeadActivities(context, input, ports),
    listLeadBoard: (context, input) => listCrmLeadBoard(context, input, ports),
    listLeads: (context, input) => listCrmLeads(context, input, ports),
    listPipelines: (context) => listCrmPipelines(context, ports),
    listVisits: (context, input) => listLeadVisits(context, input, ports),
    moveLeadPipelineStage: (context, input) =>
      moveCrmLeadPipelineStage(context, input, ports),
    restoreLead: (context, input) =>
      setCrmLeadArchived(context, { ...input, archived: false }, ports),
    updatePipeline: (context, input) =>
      updateCrmPipeline(context, input, ports),
    updateVisit: (context, input) => updateLeadVisit(context, input, ports),
    updateLead: (context, input) => updateCrmLead(context, input, ports),
    ...createCrmWhatsappServiceBindings(ports),
  };
}
export const crmServices = createCrmServices();
