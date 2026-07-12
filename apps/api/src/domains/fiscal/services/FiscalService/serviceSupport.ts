import { assertEntitlement } from "../../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type { FiscalProviderGateway } from "../../ports/fiscalProviderGateway.js";
import type {
  FiscalDocument,
  FiscalRepository,
} from "../../ports/fiscalRepository.js";

export type FiscalServicePorts = {
  fiscalProviderGateway: FiscalProviderGateway;
  fiscalRepository: FiscalRepository;
};

export function requireFiscalScope(
  context: ServiceContext,
): StoreScopedServiceContext {
  if (!context.storeId || !context.tenantId) {
    throw new FiscalScopeError();
  }

  const scoped = context as StoreScopedServiceContext;
  assertEntitlement(scoped, "nfe");
  return scoped;
}

export async function requireScopedFiscalDocument(
  scope: StoreScopedServiceContext,
  documentId: string,
  repository: FiscalRepository,
): Promise<FiscalDocument & { providerDocumentId: string }> {
  const document = await repository.findDocumentById({
    documentId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!document) throw new FiscalDocumentNotFoundError(documentId);
  const providerDocumentId = document.providerDocumentId;
  if (!providerDocumentId) {
    throw new FiscalProviderReferenceMissingError(documentId);
  }
  return { ...document, providerDocumentId };
}

export class FiscalScopeError extends Error {
  constructor() {
    super("Fiscal service requires store, tenant and nfe entitlement scope.");
    this.name = "FiscalScopeError";
  }
}

export class FiscalDocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Fiscal document not found in the current scope: ${documentId}`);
    this.name = "FiscalDocumentNotFoundError";
  }
}

export class FiscalProviderReferenceMissingError extends Error {
  constructor(documentId: string) {
    super(`Fiscal document has no provider reference: ${documentId}`);
    this.name = "FiscalProviderReferenceMissingError";
  }
}
