import { AuthorizationError } from "../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../shared/serviceContext.js";

export function assertStoreSalesActor(context: ServiceContext): void {
  if (context.actor.kind === "user") return;
  context.logger.warn(
    "sales.workflow.actor.denied",
    createServiceLogMetadata(context),
  );
  throw new AuthorizationError(
    "Sales workflow requires authenticated store user actor.",
  );
}
