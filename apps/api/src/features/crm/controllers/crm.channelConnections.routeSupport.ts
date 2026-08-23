import { CrmMessagingValidationError } from "./crm.messaging.errors.js";

export function readConnectionId(value: string | undefined) {
  if (!value) {
    throw new CrmMessagingValidationError(
      "Route param connectionId is invalid.",
    );
  }
  return value;
}
