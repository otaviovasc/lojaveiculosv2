import { assertEntitlement } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";

export function assertVehicleChecklistAccess(context: ServiceContext): void {
  assertEntitlement(context, "checklists");
}
