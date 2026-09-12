import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import type { DrizzleCrmClient } from "../../../infrastructure/db/crm/drizzleCrmRepository.js";

export type CreateCrmServicesOptions = {
  drizzleClient?: DrizzleCrmClient;
  environment?: string;
  ports?: Partial<CrmServicePorts>;
};
