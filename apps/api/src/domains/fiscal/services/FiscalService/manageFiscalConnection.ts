import type { SafeAuditMetadata } from "@lojaveiculosv2/audit";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { FiscalIssuerProfileInput } from "../../ports/fiscalProviderAdminGateway.js";
import { requireFiscalScope } from "./serviceSupport.js";
import {
  emptyConnection,
  FiscalCompanyApiKeyUnavailableError,
  type FiscalConnectionPorts,
  FiscalDefaultsValidationError,
  missingRequiredDefaults,
  readinessStatus,
  requireApiKey,
  requireConnection,
} from "../../fiscalConnectionServiceSupport.js";

export {
  FiscalCompanyApiKeyUnavailableError,
  FiscalConnectionNotConfiguredError,
  type FiscalConnectionPorts,
  FiscalDefaultsValidationError,
} from "../../fiscalConnectionServiceSupport.js";

export async function getFiscalConnection(
  context: ServiceContext,
  ports: FiscalConnectionPorts,
) {
  assertPermission(context, "fiscal.manage");
  const scope = requireFiscalScope(context);
  const connection =
    (await ports.fiscalConnectionRepository.get(scope)) ??
    emptyConnection(scope);
  logConnection(context, "fiscal.connection.read", {
    status: connection.status,
  });
  return connection;
}

export async function setupFiscalConnection(
  context: ServiceContext,
  input: {
    issuerProfile: FiscalIssuerProfileInput;
    taxDefaults?: Record<string, unknown>;
  },
  ports: FiscalConnectionPorts,
) {
  assertPermission(context, "fiscal.provider.configure");
  const scope = requireFiscalScope(context);
  const current = await ports.fiscalConnectionRepository.get(scope);
  const company = await ports.fiscalProviderAdminGateway.ensureCompany(
    input.issuerProfile,
  );
  const apiKey =
    company.apiKey ??
    (await ports.fiscalConnectionRepository.getCompanyApiKey(scope));
  if (!apiKey) throw new FiscalCompanyApiKeyUnavailableError(company.companyId);

  const [synced] = await Promise.all([
    ports.fiscalProviderAdminGateway.syncCompany(company.companyId, apiKey),
    ports.fiscalProviderAdminGateway.ensureWebhook(),
  ]);
  const taxDefaults = input.taxDefaults ?? current?.taxDefaults ?? {};
  const defaultsStatus =
    Object.keys(taxDefaults).length > 0 ? "unconfirmed" : "missing";
  const connection = await ports.fiscalConnectionRepository.upsert({
    capabilities: synced.capabilities,
    certificateExpiresAt: synced.certificateExpiresAt,
    ...(company.apiKey ? { companyApiKey: company.apiKey } : {}),
    companyId: company.companyId,
    defaultsConfirmedAt: null,
    defaultsConfirmedBy: null,
    defaultsStatus,
    issuerProfile: synced.profile,
    lastErrorCode: null,
    lastSyncedAt: new Date(),
    status: "pending_review",
    storeId: scope.storeId,
    taxDefaults,
    tenantId: scope.tenantId,
    webhookRegisteredAt: new Date(),
  });
  await auditConnection(context, scope, "fiscal.connection.setup", {
    companyCreated: company.created,
    companyId: company.companyId,
    defaultsStatus,
  });
  logConnection(context, "fiscal.connection.setup.completed", {
    companyId: company.companyId,
    status: connection.status,
  });
  return connection;
}

export async function syncFiscalConnection(
  context: ServiceContext,
  ports: FiscalConnectionPorts,
) {
  assertPermission(context, "fiscal.provider.configure");
  const scope = requireFiscalScope(context);
  const current = await requireConnection(scope, ports);
  const apiKey = await requireApiKey(scope, ports);
  const [synced] = await Promise.all([
    ports.fiscalProviderAdminGateway.syncCompany(current.companyId, apiKey),
    ports.fiscalProviderAdminGateway.ensureWebhook(),
  ]);
  const connection = await ports.fiscalConnectionRepository.upsert({
    capabilities: synced.capabilities,
    certificateExpiresAt: synced.certificateExpiresAt,
    issuerProfile: synced.profile,
    lastErrorCode: null,
    lastSyncedAt: new Date(),
    status: readinessStatus({
      ...current,
      capabilities: synced.capabilities,
      certificateExpiresAt: synced.certificateExpiresAt,
    }),
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    webhookRegisteredAt: new Date(),
  });
  await auditConnection(context, scope, "fiscal.connection.sync", {
    companyId: current.companyId,
    status: connection.status,
  });
  logConnection(context, "fiscal.connection.sync.completed", {
    companyId: current.companyId,
    status: connection.status,
  });
  return connection;
}

export async function confirmFiscalDefaults(
  context: ServiceContext,
  input: { taxDefaults: Record<string, unknown> },
  ports: FiscalConnectionPorts,
) {
  assertPermission(context, "fiscal.defaults.confirm");
  const scope = requireFiscalScope(context);
  const current = await requireConnection(scope, ports);
  const missingFields = missingRequiredDefaults(input.taxDefaults);
  if (missingFields.length) {
    throw new FiscalDefaultsValidationError(missingFields);
  }
  const now = new Date();
  const connection = await ports.fiscalConnectionRepository.upsert({
    defaultsConfirmedAt: now,
    defaultsConfirmedBy: context.actor.id,
    defaultsStatus: "confirmed",
    status: readinessStatus({
      ...current,
      defaultsConfirmedAt: now,
      defaultsStatus: "confirmed",
      taxDefaults: input.taxDefaults,
    }),
    storeId: scope.storeId,
    taxDefaults: input.taxDefaults,
    tenantId: scope.tenantId,
  });
  await auditConnection(context, scope, "fiscal.defaults.confirm", {
    companyId: current.companyId,
    status: connection.status,
  });
  logConnection(context, "fiscal.defaults.confirmed", {
    companyId: current.companyId,
    status: connection.status,
  });
  return connection;
}

export async function uploadFiscalCertificate(
  context: ServiceContext,
  input: { certificate: Blob; password: string },
  ports: FiscalConnectionPorts,
) {
  assertPermission(context, "fiscal.certificate.manage");
  const scope = requireFiscalScope(context);
  const current = await requireConnection(scope, ports);
  const result = await ports.fiscalProviderAdminGateway.uploadCertificate({
    certificate: input.certificate,
    companyId: current.companyId,
    password: input.password,
  });
  const connection = await ports.fiscalConnectionRepository.upsert({
    certificateExpiresAt: result.expirationAt,
    status: readinessStatus({
      ...current,
      certificateExpiresAt: result.expirationAt,
    }),
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  await auditConnection(context, scope, "fiscal.certificate.upload", {
    companyId: current.companyId,
    expirationAt: result.expirationAt?.toISOString() ?? null,
  });
  logConnection(context, "fiscal.certificate.uploaded", {
    companyId: current.companyId,
    status: connection.status,
  });
  return connection;
}

async function auditConnection(
  context: ServiceContext,
  scope: { storeId: string; tenantId: string },
  action: string,
  metadata: SafeAuditMetadata,
) {
  await context.audit.record({
    action,
    actor: context.actor,
    category: "integration",
    criticality: "critical",
    entityId: scope.storeId,
    entityType: "fiscal_connection",
    metadata,
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    summary: "Managed the store fiscal provider connection",
  });
}

function logConnection(
  context: ServiceContext,
  event: string,
  metadata: SafeAuditMetadata,
) {
  context.logger.info(
    event,
    createServiceLogMetadata(context, { ...metadata }),
  );
}
