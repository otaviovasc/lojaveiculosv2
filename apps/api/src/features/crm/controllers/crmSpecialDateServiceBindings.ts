import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import {
  runConfiguredSpecialDatesEvaluation,
  type EvaluateConfiguredSpecialDatesInput,
  type EvaluateConfiguredSpecialDatesResult,
} from "../../../domains/crm/messaging/crmSpecialDateWorkerHelper.js";
import {
  evaluateStoreSpecialDates,
  type EvaluateStoreSpecialDatesResult,
} from "../../../domains/crm/services/CrmSpecialDateService/evaluateStoreSpecialDates.js";
import {
  getSpecialDateConfigs,
  type SpecialDateConfigView,
} from "../../../domains/crm/services/CrmSpecialDateService/getSpecialDateConfigs.js";
import {
  updateSpecialDateConfig,
  type UpdateSpecialDateConfigInput,
} from "../../../domains/crm/services/CrmSpecialDateService/updateSpecialDateConfigs.js";

export type CrmSpecialDateServices = {
  evaluateConfiguredSpecialDates: (
    context: ServiceContext,
    input?: EvaluateConfiguredSpecialDatesInput,
  ) => Promise<EvaluateConfiguredSpecialDatesResult>;
  evaluateStoreSpecialDates: (
    context: ServiceContext,
    input?: { referenceDate?: Date },
  ) => Promise<EvaluateStoreSpecialDatesResult>;
  getSpecialDateConfigs: (
    context: ServiceContext,
    input: { connectionId: string },
  ) => Promise<readonly SpecialDateConfigView[]>;
  updateSpecialDateConfig: (
    context: ServiceContext,
    input: UpdateSpecialDateConfigInput,
  ) => Promise<SpecialDateConfigView>;
};

export function createCrmSpecialDateServiceBindings(
  ports: CrmServicePorts,
): CrmSpecialDateServices {
  return {
    evaluateConfiguredSpecialDates: (context, input = {}) =>
      runConfiguredSpecialDatesEvaluation(context, ports, input),
    evaluateStoreSpecialDates: (context, input = {}) =>
      evaluateStoreSpecialDates(context, ports, input.referenceDate),
    getSpecialDateConfigs: (context, input) =>
      getSpecialDateConfigs(context, input.connectionId, ports),
    updateSpecialDateConfig: (context, input) =>
      updateSpecialDateConfig(context, input, ports),
  };
}
