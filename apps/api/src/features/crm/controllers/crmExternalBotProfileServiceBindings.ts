import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  CrmExternalBotProfile,
  CrmExternalBotProfileConnectionAssignment,
} from "../../../domains/crm/ports/crmExternalBotProfileRepository.js";
import {
  assignExternalBotProfileToConnection,
  type AssignExternalBotProfileToConnectionInput,
} from "../../../domains/crm/services/CrmExternalBotProfileService/assignExternalBotProfileToConnection.js";
import {
  createExternalBotProfile,
  type CreateExternalBotProfileInput,
} from "../../../domains/crm/services/CrmExternalBotProfileService/createExternalBotProfile.js";
import { listExternalBotProfileAssignments } from "../../../domains/crm/services/CrmExternalBotProfileService/listExternalBotProfileAssignments.js";
import { listExternalBotProfiles } from "../../../domains/crm/services/CrmExternalBotProfileService/listExternalBotProfiles.js";
import {
  updateExternalBotProfile,
  type UpdateExternalBotProfileInput,
} from "../../../domains/crm/services/CrmExternalBotProfileService/updateExternalBotProfile.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";

export type CrmExternalBotProfileServices = {
  listExternalBotProfiles: (
    context: ServiceContext,
  ) => Promise<readonly CrmExternalBotProfile[]>;
  createExternalBotProfile: (
    context: ServiceContext,
    input: CreateExternalBotProfileInput,
  ) => Promise<CrmExternalBotProfile>;
  updateExternalBotProfile: (
    context: ServiceContext,
    input: UpdateExternalBotProfileInput,
  ) => Promise<CrmExternalBotProfile>;
  listExternalBotProfileAssignments: (
    context: ServiceContext,
  ) => Promise<readonly CrmExternalBotProfileConnectionAssignment[]>;
  assignExternalBotProfileToConnection: (
    context: ServiceContext,
    input: AssignExternalBotProfileToConnectionInput,
  ) => Promise<void>;
};

export function createCrmExternalBotProfileServiceBindings(
  ports: CrmServicePorts,
): CrmExternalBotProfileServices {
  return {
    listExternalBotProfiles: (context) =>
      listExternalBotProfiles(context, ports),
    createExternalBotProfile: (context, input) =>
      createExternalBotProfile(context, input, ports),
    updateExternalBotProfile: (context, input) =>
      updateExternalBotProfile(context, input, ports),
    listExternalBotProfileAssignments: (context) =>
      listExternalBotProfileAssignments(context, ports),
    assignExternalBotProfileToConnection: (context, input) =>
      assignExternalBotProfileToConnection(context, input, ports),
  };
}
