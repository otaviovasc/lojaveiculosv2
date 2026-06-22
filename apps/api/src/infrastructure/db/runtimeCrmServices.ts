import { createHttpRepassesCrmClient } from "../../domains/crm/acl/repassesCrmClient.js";
import { createLocalDemoRepassesCrmClient } from "../../domains/crm/acl/localDemoRepassesCrmClient.js";
import {
  createCrmServices,
  type CrmServices,
} from "../../features/crm/controllers/crmServices.js";
import type { RepassesCrmClient } from "../../domains/crm/acl/repassesCrmClient.js";
import type { DrizzleCrmClient } from "./crm/drizzleCrmRepository.js";

export function createRuntimeCrmServices(
  db: unknown,
  env: Record<string, string | undefined>,
): CrmServices {
  const repassesCrmClient = resolveRuntimeRepassesCrmClient(env);

  return createCrmServices({
    drizzleClient: db as DrizzleCrmClient,
    ...(repassesCrmClient ? { repassesCrmClient } : {}),
  });
}

export function resolveRuntimeRepassesCrmClient(
  env: Record<string, string | undefined>,
): RepassesCrmClient | undefined {
  const repassesCrmApiUrl = env.REPASSES_CRM_API_URL;

  if (
    allowsLocalDemoRepassesCrm(env) &&
    env.REPASSES_CRM_LOCAL_DEMO === "true"
  ) {
    return createLocalDemoRepassesCrmClient();
  }
  if (isConfiguredRepassesCrmUrl(repassesCrmApiUrl)) {
    return createHttpRepassesCrmClient({ baseUrl: repassesCrmApiUrl });
  }
  if (allowsLocalDemoRepassesCrm(env))
    return createLocalDemoRepassesCrmClient();
  return undefined;
}

function allowsLocalDemoRepassesCrm(env: Record<string, string | undefined>) {
  return env.APP_ENV === "local" && env.LOCAL_AUTH_BYPASS === "true";
}

function isConfiguredRepassesCrmUrl(value?: string): value is string {
  return Boolean(value && value.trim() && !value.includes("${{"));
}
