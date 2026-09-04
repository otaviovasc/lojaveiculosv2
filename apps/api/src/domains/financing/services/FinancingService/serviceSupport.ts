import { createHash, randomBytes } from "node:crypto";
import type { SafeAuditMetadata } from "@lojaveiculosv2/audit";
import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
  type StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  FinancingConnection,
  FinancingProvider,
  FinancingRepository,
  FinancingTokenSet,
} from "../../ports/financingRepository.js";
import type { FinancingProviderGateway as ContractFinancingProviderGateway } from "../../ports/financingProviderGateway.js";

export const credereOAuthCallbackUri =
  "/api/v1/financing/credere/oauth/callback";

export const financingConnectionManagePermission =
  "financing.connection.manage" as PermissionKey;
export const financingSimulationCreatePermission =
  "financing.simulation.create" as PermissionKey;
export const financingSimulationReadPermission =
  "financing.simulation.read" as PermissionKey;

export type FinancingServicePorts = {
  clock?: () => Date;
  gateway?: FinancingProviderGateway;
  oauthRedirectUri?: string;
  repository: FinancingRepository;
};

export type FinancingProviderGateway = Omit<
  ContractFinancingProviderGateway,
  "createAuthorizationUrl" | "exchangeAuthorizationCode"
> & {
  createAuthorizationUrl: (input: {
    codeChallenge?: string;
    codeChallengeMethod?: "S256";
    redirectUri: string;
    state: string;
  }) => Promise<string>;
  exchangeAuthorizationCode: (input: {
    code: string;
    codeVerifier?: string;
    redirectUri: string;
  }) => Promise<FinancingTokenSet>;
  supportsPkce?: boolean;
};

export class FinancingScopeError extends Error {
  constructor(fieldName: string) {
    super(`Financing service requires ${fieldName}.`);
    this.name = "FinancingScopeError";
  }
}

export class FinancingGatewayMissingError extends Error {
  constructor() {
    super("Financing provider gateway is not configured.");
    this.name = "FinancingGatewayMissingError";
  }
}

export class FinancingConnectionMissingError extends Error {
  constructor(provider: FinancingProvider) {
    super(`Financing provider connection is missing: ${provider}`);
    this.name = "FinancingConnectionMissingError";
  }
}

export class FinancingOAuthStateInvalidError extends Error {
  constructor() {
    super("Financing OAuth state is invalid, expired, or already used.");
    this.name = "FinancingOAuthStateInvalidError";
  }
}

export class FinancingProviderMappingRequiredError extends Error {
  readonly statusCode = 409;

  constructor() {
    super("Financing provider store mapping is required.");
    this.name = "FinancingProviderMappingRequiredError";
  }
}

export class FinancingNoUsableBanksError extends Error {
  readonly statusCode = 409;

  constructor() {
    super("No usable financing banks are available for this store.");
    this.name = "FinancingNoUsableBanksError";
  }
}

export class FinancingConsentRequiredError extends Error {
  constructor() {
    super("Explicit financing simulation consent is required.");
    this.name = "FinancingConsentRequiredError";
  }
}

export class FinancingIdempotencyConflictError extends Error {
  readonly statusCode = 409;

  constructor() {
    super(
      "Financing simulation idempotency key was reused with different data.",
    );
    this.name = "FinancingIdempotencyConflictError";
  }
}

export class FinancingOperationInProgressError extends Error {
  readonly statusCode = 409;

  constructor() {
    super(
      "Financing simulation with this idempotency key is still being prepared.",
    );
    this.name = "FinancingOperationInProgressError";
  }
}

export class FinancingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinancingValidationError";
  }
}

export function requireFinancingScope(context: ServiceContext): {
  storeId: StoreId;
  tenantId: TenantId;
} {
  if (!context.storeId) throw new FinancingScopeError("storeId");
  if (!context.tenantId) throw new FinancingScopeError("tenantId");
  assertEntitlement(context as StoreScopedServiceContext, "financing");
  return {
    storeId: context.storeId as StoreId,
    tenantId: context.tenantId as TenantId,
  };
}

export function requireAgencyFinancingScope(context: ServiceContext): {
  tenantId: TenantId;
} {
  if (!context.tenantId) throw new FinancingScopeError("tenantId");
  return { tenantId: context.tenantId as TenantId };
}

export function assertFinancingPermission(
  context: ServiceContext,
  permission: PermissionKey,
): void {
  assertPermission(context, permission);
}

export function getFinancingGateway(
  ports: FinancingServicePorts,
): FinancingProviderGateway {
  if (ports.gateway) return ports.gateway;
  throw new FinancingGatewayMissingError();
}

export function now(ports: FinancingServicePorts): Date {
  return ports.clock?.() ?? new Date();
}

export function resolveOAuthRedirectUri(ports: FinancingServicePorts): string {
  return ports.oauthRedirectUri ?? credereOAuthCallbackUri;
}

export function createOpaqueState(): string {
  return randomBytes(32).toString("base64url");
}

export function createPkceVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256Base64Url(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function normalizeBankCode(value: string): string {
  return value.trim();
}

export function normalizeDocument(value: string): string {
  return value.replace(/\D/g, "");
}

export function documentLast4(value: string): string {
  return normalizeDocument(value).slice(-4);
}

export function assertActiveConnection(
  connection: FinancingConnection | null,
  provider: FinancingProvider,
): FinancingConnection {
  if (!connection?.token || connection.status !== "connected") {
    throw new FinancingConnectionMissingError(provider);
  }
  return connection;
}

export function logFinancingServiceEvent(
  context: ServiceContext,
  event: string,
  metadata: SafeAuditMetadata = {},
): void {
  context.logger.info(event, createServiceLogMetadata(context, metadata));
}
