import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export type CrmConnectionProvider = "zapi";

export type CrmConnectionConfiguredStatus =
  "sandbox" | "active" | "paused" | "disconnected" | "error" | "archived";

export type CrmConnection = {
  credentialsRef: Record<string, unknown>;
  displayName: string;
  externalConnectionId: string | null;
  externalInstanceId: string | null;
  id: string;
  metadata: Record<string, unknown>;
  phone: string | null;
  provider: CrmConnectionProvider;
  status: CrmConnectionConfiguredStatus;
  storeId: StoreId;
  tenantId: TenantId;
  webhookUrl: string | null;
};

export type ListCrmConnectionsInput = {
  providers?: readonly CrmConnectionProvider[];
  storeId: StoreId;
  tenantId: TenantId;
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
  webhookUrl?: string | null;
};

export type CrmConnectionRepository = {
  findConnectionById: (connectionId: string) => Promise<CrmConnection | null>;
  listConnections: (
    input: ListCrmConnectionsInput,
  ) => Promise<readonly CrmConnection[]>;
  updateConnection: (
    input: UpdateCrmConnectionInput,
  ) => Promise<CrmConnection | null>;
};
