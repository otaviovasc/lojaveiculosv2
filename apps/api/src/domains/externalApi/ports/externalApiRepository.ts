import type {
  EntitlementKey,
  PermissionKey,
  StoreId,
  TenantId,
} from "@lojaveiculosv2/shared";

export type ExternalApiClientStatus = "active" | "revoked" | "suspended";

export type ExternalApiClient = {
  createdAt: Date;
  id: string;
  keyPrefixes: readonly string[];
  lastUsedAt: Date | null;
  name: string;
  scopes: readonly PermissionKey[];
  status: ExternalApiClientStatus;
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date;
};

export type ExternalApiAuthenticatedClient = {
  clientId: string;
  clientName: string;
  entitlements: readonly EntitlementKey[];
  keyId: string;
  keyPrefix: string;
  scopes: readonly PermissionKey[];
  storeId: StoreId;
  tenantId: TenantId;
};

export type CreateExternalApiClientInput = {
  keyHash: string;
  keyPrefix: string;
  name: string;
  scopes: readonly PermissionKey[];
  storeId: StoreId;
  tenantId: TenantId;
};

export type RevokeExternalApiClientInput = {
  clientId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type AuthenticateExternalApiKeyInput = {
  keyHash: string;
  now: Date;
};

export type ExternalApiIdempotencyReservation =
  | { kind: "conflict"; requestFingerprint: string }
  | { kind: "created" }
  | { kind: "failed"; statusCode: number | null }
  | { kind: "in_flight" }
  | {
      body: unknown;
      contentType: string;
      kind: "replay";
      statusCode: number;
    };

export type ReserveExternalApiIdempotencyInput = {
  clientId: string;
  idempotencyKey: string;
  method: string;
  path: string;
  requestFingerprint: string;
  requestId: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type RecordExternalApiRequestInput = {
  clientId: string;
  idempotencyKey?: string;
  method: string;
  path: string;
  requestId: string;
  responseMs: number;
  statusCode: number;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CompleteExternalApiIdempotencyInput = {
  body: unknown;
  clientId: string;
  contentType: string;
  idempotencyKey: string;
  requestFingerprint: string;
  responseMs: number;
  statusCode: number;
};

export type FailExternalApiIdempotencyInput = {
  clientId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  responseMs: number;
  statusCode: number;
};

export type ExternalApiRepository = {
  authenticateByKeyHash: (
    input: AuthenticateExternalApiKeyInput,
  ) => Promise<ExternalApiAuthenticatedClient | null>;
  countRecentRequests: (input: {
    clientId: string;
    since: Date;
  }) => Promise<number>;
  completeIdempotencyKey: (
    input: CompleteExternalApiIdempotencyInput,
  ) => Promise<boolean>;
  createClient: (
    input: CreateExternalApiClientInput,
  ) => Promise<ExternalApiClient>;
  listClients: (input: {
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<readonly ExternalApiClient[]>;
  failIdempotencyKey: (
    input: FailExternalApiIdempotencyInput,
  ) => Promise<boolean>;
  revokeClient: (
    input: RevokeExternalApiClientInput,
  ) => Promise<ExternalApiClient | null>;
  recordRequest: (input: RecordExternalApiRequestInput) => Promise<void>;
  reserveIdempotencyKey: (
    input: ReserveExternalApiIdempotencyInput,
  ) => Promise<ExternalApiIdempotencyReservation>;
};
