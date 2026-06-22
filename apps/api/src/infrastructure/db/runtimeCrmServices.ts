import { createHttpRepassesCrmClient } from "../../domains/crm/acl/repassesCrmClient.js";
import {
  createCrmServices,
  type CrmServices,
} from "../../features/crm/controllers/crmServices.js";
import type { DrizzleCrmClient } from "./crm/drizzleCrmRepository.js";

export function createRuntimeCrmServices(
  db: unknown,
  env: Record<string, string | undefined>,
): CrmServices {
  return createCrmServices({
    drizzleClient: db as DrizzleCrmClient,
    ...(env.REPASSES_CRM_API_URL
      ? {
          repassesCrmClient: createHttpRepassesCrmClient({
            baseUrl: env.REPASSES_CRM_API_URL,
          }),
        }
      : {}),
  });
}
