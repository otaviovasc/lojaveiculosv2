import type { CrmRoutingConnectionCapability } from "../../ports/crmRoutingConnectionRepository.js";
import type {
  CrmBotRoutingMode,
  CrmRoutingChannel,
} from "../../ports/crmRoutingPolicyRepository.js";
import type { CrmTransportProvider } from "../../core/models.js";

export type CrmRoutingCapability = CrmRoutingConnectionCapability;

export type CrmRoutingBlockedCode =
  | "capability_unsupported"
  | "channel_incompatible"
  | "connection_inactive"
  | "connection_not_connected"
  | "connection_not_found"
  | "policy_not_configured"
  | "route_disabled"
  | "scope_mismatch";

export type CrmRoutingConnectionReadModel = {
  active: boolean;
  capabilities: readonly CrmRoutingCapability[];
  channel: CrmRoutingChannel;
  connected: boolean;
  displayName: string;
  id: string;
  provider: CrmTransportProvider;
  readiness: {
    ready: boolean;
    reason: string | null;
    reasonCode: string | null;
  };
  state:
    "active" | "archived" | "disconnected" | "error" | "paused" | "sandbox";
  isDefault: boolean;
};

export type CrmResolvedConnectionRoute = {
  blocked: {
    code: CrmRoutingBlockedCode;
    message: string;
    remediation: string;
  } | null;
  connection: CrmRoutingConnectionReadModel | null;
  ready: boolean;
  requiredCapabilities: readonly CrmRoutingCapability[];
};

export type CrmChannelRoutingReadModel = {
  bot: CrmResolvedConnectionRoute & { mode: CrmBotRoutingMode };
  channel: CrmRoutingChannel;
  storeDefault: CrmResolvedConnectionRoute;
};

export type CrmRoutingPolicyReadModel = {
  channels: readonly CrmChannelRoutingReadModel[];
  storeId: string;
  tenantId: string;
};
