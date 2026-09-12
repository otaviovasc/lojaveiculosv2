import type { PermissionKey } from "@lojaveiculosv2/shared";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import { assertEntitlement } from "../../../../shared/authorization.js";
import type { CrmExternalBotProfileRepository } from "../../ports/crmExternalBotProfileRepository.js";
import { CrmScopeError } from "../../crmScopeError.js";
import {
  requireCrmScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";

export const botProfileReadPermissions = [
  "crm.bot.read",
  "crm.bot.manage",
] as const satisfies readonly PermissionKey[];
export const botProfileManagePermissions = [
  "crm.bot.manage",
] as const satisfies readonly PermissionKey[];

export function requireCrmExternalBotProfileScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  assertEntitlement(context as StoreScopedServiceContext, "crm");
  return requireCrmScope(context);
}

export function getCrmExternalBotProfileRepository(
  ports: CrmServicePorts,
): CrmExternalBotProfileRepository {
  if (!ports.crmExternalBotProfileRepository) {
    throw new CrmScopeError("crmExternalBotProfileRepository");
  }
  return ports.crmExternalBotProfileRepository;
}
