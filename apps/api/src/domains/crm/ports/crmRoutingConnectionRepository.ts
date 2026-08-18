import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  CrmChannel,
  CrmCredentialBroker,
  CrmTransportProvider,
} from "../core/models.js";

export type CrmRoutingConnectionCapability =
  "inbound" | "outbound" | "scheduling" | "templates";

export type CrmRoutingConnection = {
  capabilities: Readonly<Record<CrmRoutingConnectionCapability, boolean>>;
  channel: CrmChannel;
  connected: boolean;
  credentialBroker: CrmCredentialBroker;
  degraded: boolean;
  displayName: string;
  errorCode: string | null;
  id: string;
  provider: CrmTransportProvider;
  state:
    "active" | "archived" | "disconnected" | "error" | "paused" | "sandbox";
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmRoutingConnectionRepository = {
  listConnections(input: {
    storeId: StoreId;
    tenantId: TenantId;
  }): Promise<readonly CrmRoutingConnection[]>;
};
