import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CrmChannel,
  CrmCredentialBroker,
  CrmTransportProvider,
} from "../core/models.js";
import type { CrmChannelConnectionProjection } from "./crmChannelConnectionProjection.js";

export type CrmConnectionProvider = CrmTransportProvider;

export type CrmConnectionConfiguredStatus =
  "sandbox" | "active" | "paused" | "disconnected" | "error" | "archived";

export type CrmConnection = {
  /** Canonical read facts. Provider-specific setup fields remain below. */
  broker: CrmCredentialBroker;
  canonical?: CrmChannelConnectionProjection;
  channel: CrmChannel;
  credentialsRef: Record<string, unknown>;
  displayName: string;
  externalConnectionId: string | null;
  externalInstanceId: string | null;
  id: string;
  metadata: Record<string, unknown>;
  phone: string | null;
  /** Canonical per-store phone number (crm_channel_connections.phone_number). */
  phoneNumber?: string | null;
  provider: CrmConnectionProvider;
  revision?: number;
  status: CrmConnectionConfiguredStatus;
  storeId: StoreId;
  tenantId: TenantId;
  webhookUrl: string | null;
};

export type ListCrmConnectionsInput = {
  brokers?: readonly CrmCredentialBroker[];
  channels?: readonly CrmChannel[];
  providers?: readonly CrmConnectionProvider[];
  storeId: StoreId;
  tenantId: TenantId;
};

export type FindCrmConnectionByExternalIdInput = {
  brokers?: readonly CrmCredentialBroker[];
  channels: readonly CrmChannel[];
  externalConnectionId: string;
  providers: readonly CrmConnectionProvider[];
};

export type CreateCrmConnectionInput = {
  broker: CrmCredentialBroker;
  channel: CrmChannel;
  credentialsRef?: Record<string, unknown>;
  displayName: string;
  externalConnectionId?: string | null;
  externalInstanceId?: string | null;
  metadata?: Record<string, unknown>;
  phone?: string | null;
  provider: CrmConnectionProvider;
  status?: CrmConnectionConfiguredStatus;
  storeId: StoreId;
  tenantId: TenantId;
  webhookUrl?: string | null;
};

export type UpdateCrmConnectionInput = {
  connectionId: string;
  credentialsRef?: Record<string, unknown>;
  displayName?: string;
  externalConnectionId?: string | null;
  externalInstanceId?: string | null;
  metadata?: Record<string, unknown>;
  phone?: string | null;
  status?: CrmConnectionConfiguredStatus;
  storeId: StoreId;
  tenantId: TenantId;
  expectedRevision?: number;
  webhookUrl?: string | null;
};

export type ConfigureInitialZapiCredentialsResult =
  | { connection: CrmConnection; status: "configured" }
  | { status: "already_configured" | "not_found" | "partial_state" };

export type AuthorizeOlxConnectionResult = {
  connection: CrmConnection;
  replacedConnectionId: string | null;
};

export type CrmConnectionRepository = {
  archiveAbandonedZapiConnections: (input: {
    cutoff: Date;
    limit: number;
  }) => Promise<readonly CrmConnection[]>;
  createConnection: (input: CreateCrmConnectionInput) => Promise<CrmConnection>;
  upsertOlxConnection: (
    input: Omit<CreateCrmConnectionInput, "broker" | "channel" | "provider">,
  ) => Promise<AuthorizeOlxConnectionResult>;
  configureInitialZapiCredentials: (input: {
    connectionId: string;
    credentialsRef: Record<string, unknown>;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<ConfigureInitialZapiCredentialsResult>;
  claimZapiWebhookSetup: (input: {
    allowConfigured?: boolean;
    connectionId: string;
    leaseExpiresAt: Date;
    leaseOwner: string;
    now: Date;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<CrmConnection | null>;
  claimOlxWebhookSetup?: CrmConnectionRepository["claimZapiWebhookSetup"];
  finishZapiWebhookSetup: (input: {
    connectionId: string;
    leaseOwner: string;
    metadata: Record<string, unknown>;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<CrmConnection | null>;
  finishOlxWebhookSetup?: CrmConnectionRepository["finishZapiWebhookSetup"];
  findConnectionByExternalId: (
    input: FindCrmConnectionByExternalIdInput,
  ) => Promise<CrmConnection | null>;
  findConnectionById: (connectionId: string) => Promise<CrmConnection | null>;
  listConnections: (
    input: ListCrmConnectionsInput,
  ) => Promise<readonly CrmConnection[]>;
  updateConnection: (
    input: UpdateCrmConnectionInput,
  ) => Promise<CrmConnection | null>;
};
