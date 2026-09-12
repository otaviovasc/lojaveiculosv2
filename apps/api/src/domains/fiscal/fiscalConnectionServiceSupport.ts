import type {
  FiscalConnection,
  FiscalConnectionRepository,
} from "./ports/fiscalConnectionRepository.js";
import type { FiscalProviderAdminGateway } from "./ports/fiscalProviderAdminGateway.js";

export type FiscalConnectionPorts = {
  fiscalConnectionRepository: FiscalConnectionRepository;
  fiscalProviderAdminGateway: FiscalProviderAdminGateway;
};

export function readinessStatus(connection: FiscalConnection) {
  if (
    !connection.companyId ||
    connection.defaultsStatus !== "confirmed" ||
    !connection.webhookRegisteredAt
  ) {
    return "pending_review" as const;
  }
  if (
    requiresDigitalCertificate(connection.capabilities) &&
    (!connection.certificateExpiresAt ||
      connection.certificateExpiresAt.getTime() <= Date.now())
  ) {
    return "pending_review" as const;
  }
  return "ready" as const;
}

export function missingRequiredDefaults(value: Record<string, unknown>) {
  const nfe = recordValue(value.nfe);
  const nfse = recordValue(value.nfse);
  const required = [
    ["nfe.operationNature", nfe, "operationNature"],
    ["nfe.destination", nfe, "destination"],
    ["nfe.isFinalCustomer", nfe, "isFinalCustomer"],
    ["nfe.operationType", nfe, "operationType"],
    ["nfe.presenceType", nfe, "presenceType"],
    ["nfe.purposeType", nfe, "purposeType"],
    ["nfe.cfop", nfe, "cfop"],
    ["nfe.ncm", nfe, "ncm"],
    ["nfe.icmsOrigin", nfe, "icmsOrigin"],
    ["nfe.icmsCst", nfe, "icmsCst"],
    ["nfe.pisCst", nfe, "pisCst"],
    ["nfe.cofinsCst", nfe, "cofinsCst"],
    ["nfse.taxLocation", nfse, "taxLocation"],
    ["nfse.taxationType", nfse, "taxationType"],
  ] as const;
  return required
    .filter(([, record, key]) => !hasReviewedValue(record, key))
    .map(([path]) => path);
}

export async function requireConnection(
  scope: { storeId: string; tenantId: string },
  ports: FiscalConnectionPorts,
) {
  const connection = await ports.fiscalConnectionRepository.get(scope);
  if (!connection?.companyId) throw new FiscalConnectionNotConfiguredError();
  return connection as FiscalConnection & { companyId: string };
}

export async function requireApiKey(
  scope: { storeId: string; tenantId: string },
  ports: FiscalConnectionPorts,
) {
  const apiKey = await ports.fiscalConnectionRepository.getCompanyApiKey(scope);
  if (!apiKey) throw new FiscalConnectionNotConfiguredError();
  return apiKey;
}

export function emptyConnection(scope: { storeId: string; tenantId: string }) {
  return {
    capabilities: {},
    certificateExpiresAt: null,
    companyId: null,
    defaultsConfirmedAt: null,
    defaultsConfirmedBy: null,
    defaultsStatus: "missing" as const,
    issuerProfile: {},
    lastErrorCode: null,
    lastSyncedAt: null,
    provider: "spedy" as const,
    status: "not_configured" as const,
    storeId: scope.storeId,
    taxDefaults: {},
    tenantId: scope.tenantId,
    webhookRegisteredAt: null,
  };
}

function requiresDigitalCertificate(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(requiresDigitalCertificate);
  const record = value as Record<string, unknown>;
  return (
    record.requiresDigitalCertificate === true ||
    Object.values(record).some(requiresDigitalCertificate)
  );
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasReviewedValue(record: Record<string, unknown>, key: string) {
  if (!Object.hasOwn(record, key)) return false;
  const value = record[key];
  return value !== null && value !== undefined && value !== "";
}

export class FiscalConnectionNotConfiguredError extends Error {
  constructor() {
    super("Fiscal provider connection is not configured.");
    this.name = "FiscalConnectionNotConfiguredError";
  }
}

export class FiscalCompanyApiKeyUnavailableError extends Error {
  constructor(companyId: string) {
    super(`Spedy did not return a usable API key for company ${companyId}.`);
    this.name = "FiscalCompanyApiKeyUnavailableError";
  }
}

export class FiscalDefaultsValidationError extends Error {
  constructor(readonly missingFields: readonly string[]) {
    super(
      "Fiscal defaults are incomplete and cannot be confirmed for NF-e/NFS-e.",
    );
    this.name = "FiscalDefaultsValidationError";
  }
}
