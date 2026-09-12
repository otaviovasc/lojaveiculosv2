import type {
  CrmCoreRouteDependencies,
  CrmCoreRouter,
} from "./crm.core.types.js";
import { registerCrmCoreActionRoutes } from "./crm.core.actionRoutes.js";
import { registerCrmCoreResourceRoutes } from "./crm.core.resourceRoutes.js";

export function registerCrmCoreRoutes(
  router: CrmCoreRouter,
  dependencies: CrmCoreRouteDependencies,
): void {
  registerCrmCoreResourceRoutes(router, dependencies);
  registerCrmCoreActionRoutes(router, dependencies);
}
