import { AuthorizationError } from "../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../shared/serviceContext.js";

export function assertStoreUserActor(context: ServiceContext): void {
  if (context.actor.kind === "user") return;
  context.logger.warn(
    "vehicle.workflow.actor.denied",
    createServiceLogMetadata(context),
  );
  throw new AuthorizationError(
    "Vehicle workflow requires authenticated store user actor.",
  );
}
