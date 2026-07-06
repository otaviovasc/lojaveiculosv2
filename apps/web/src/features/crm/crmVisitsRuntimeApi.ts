import type { CreateProductCrmApiOptions } from "./productCrmApi";
import { createProductCrmApiOptions } from "./runtimeApi";
import { createCrmVisitsApi, type CrmVisitsApi } from "./crmVisitsApi";

export function createRuntimeCrmVisitsApi(): CrmVisitsApi {
  return {
    cancelVisit: async (visitId) =>
      createCrmVisitsApi(await createOptions()).cancelVisit(visitId),
    completeVisit: async (visitId) =>
      createCrmVisitsApi(await createOptions()).completeVisit(visitId),
    createVisit: async (input) =>
      createCrmVisitsApi(await createOptions()).createVisit(input),
    listVisits: async (input) =>
      createCrmVisitsApi(await createOptions()).listVisits(input),
    updateVisit: async (visitId, input) =>
      createCrmVisitsApi(await createOptions()).updateVisit(visitId, input),
  };
}

function createOptions(): Promise<CreateProductCrmApiOptions> {
  return createProductCrmApiOptions();
}
