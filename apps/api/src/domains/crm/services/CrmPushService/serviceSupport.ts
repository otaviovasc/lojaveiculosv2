import { AuthorizationError } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmPushDeliveryProvider } from "../../ports/crmPushDeliveryProvider.js";
import type { CrmPushRepository } from "../../ports/crmPushRepository.js";
import type { CrmServicePorts } from "../CrmService/types.js";

export class InvalidCrmPushSubscriptionIdError extends Error {
  constructor() {
    super("Invalid OneSignal subscription ID.");
    this.name = "InvalidCrmPushSubscriptionIdError";
  }
}

export function getCrmPushDeliveryProvider(
  ports: CrmServicePorts,
): CrmPushDeliveryProvider {
  if (!ports.crmPushDeliveryProvider) {
    throw new Error("CRM push delivery provider is unavailable.");
  }
  return ports.crmPushDeliveryProvider;
}

export function getCrmPushRepository(
  ports: CrmServicePorts,
): CrmPushRepository {
  if (!ports.crmPushRepository) {
    throw new Error("CRM push repository is unavailable.");
  }
  return ports.crmPushRepository;
}

export function normalizeCrmPushSubscriptionId(value: string): string {
  const normalized = value.trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized,
    )
  ) {
    throw new InvalidCrmPushSubscriptionIdError();
  }
  return normalized;
}

export function requireCrmPushUser(context: ServiceContext): string {
  if (context.actor.kind !== "user") {
    throw new AuthorizationError("CRM push settings require a user actor.");
  }
  return context.actor.id;
}
