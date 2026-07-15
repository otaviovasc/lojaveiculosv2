import {
  externalApiAssignableScopes,
  type PermissionKey,
} from "@lojaveiculosv2/shared";
import { assertEntitlement } from "../../../../shared/authorization.js";
import type { ExternalApiRepository } from "../../ports/externalApiRepository.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";

export type ExternalApiServicePorts = {
  externalApiRepository: ExternalApiRepository;
};

export { externalApiAssignableScopes };

const assignableScopeSet = new Set<string>(externalApiAssignableScopes);

export function requireExternalApiScope(context: ServiceContext) {
  if (!context.storeId || !context.tenantId) {
    throw new ExternalApiScopeError();
  }
  assertEntitlement(context as StoreScopedServiceContext, "external_api");

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
