import type { PermissionKey } from "@lojaveiculosv2/shared";
import type { ExternalApiRepository } from "../../ports/externalApiRepository.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";

export type ExternalApiServicePorts = {
  externalApiRepository: ExternalApiRepository;
};

export const externalApiAssignableScopes = [
  "crm.access",
  "finance.attach_document",
  "finance.create",
  "finance.read",
  "finance.update",
  "inventory.cost_create",
  "inventory.create",
  "inventory.document_attach",
  "inventory.media_update",
  "inventory.read",
  "inventory.reserve",
  "inventory.sell",
  "inventory.update_description",
  "inventory.update_price",
  "inventory.update_status",
  "inventory.update_unit",
  "lead.create",
  "lead.read",
  "lead.update",
] satisfies PermissionKey[];

const assignableScopeSet = new Set<string>(externalApiAssignableScopes);

export function requireExternalApiScope(context: ServiceContext) {
  if (!context.storeId || !context.tenantId) {
    throw new ExternalApiScopeError();
  }

  return {
    storeId: context.storeId as never,
    tenantId: context.tenantId as never,
  };
}

export function assertExternalApiAssignableScopes(
  scopes: readonly PermissionKey[],
): void {
  const invalidScope = scopes.find((scope) => !assignableScopeSet.has(scope));
  if (invalidScope) throw new ExternalApiScopeValidationError(invalidScope);
}

export class ExternalApiScopeError extends Error {
  constructor() {
    super("External API requires store and tenant scope.");
    this.name = "ExternalApiScopeError";
  }
}

export class ExternalApiScopeValidationError extends Error {
  constructor(scope: string) {
    super(`External API scope is not assignable: ${scope}`);
    this.name = "ExternalApiScopeValidationError";
  }
}

export class ExternalApiClientNotFoundError extends Error {
  constructor(clientId: string) {
    super(`External API client not found: ${clientId}`);
    this.name = "ExternalApiClientNotFoundError";
  }
}
