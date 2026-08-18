import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export const crmMessagingChannels = [
  "whatsapp",
  "instagram",
  "olx_chat",
] as const;

export type CrmMessagingChannel = (typeof crmMessagingChannels)[number];
export type CrmExternalBotRouteMode =
  "disabled" | "inherit_store_default" | "explicit_connection";

export type CrmChannelRoutingPolicy = {
  externalBotConnectionId: string | null;
  externalBotMode: CrmExternalBotRouteMode;
  channel: CrmMessagingChannel;
  defaultConnectionId: string | null;
  id: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmRoutingPolicyScope = {
  storeId: StoreId;
  tenantId: TenantId;
};

export type UpsertCrmChannelRoutingPolicyInput = CrmRoutingPolicyScope & {
  externalBotConnectionId: string | null;
  externalBotMode: CrmExternalBotRouteMode;
  channel: CrmMessagingChannel;
  defaultConnectionId: string | null;
};

export type CrmRoutingPolicyRepository = {
  createDefaultIfMissing: (
    input: UpsertCrmChannelRoutingPolicyInput,
  ) => Promise<CrmChannelRoutingPolicy | null>;
  listPolicies: (
    scope: CrmRoutingPolicyScope,
  ) => Promise<readonly CrmChannelRoutingPolicy[]>;
  upsertPolicy: (
    input: UpsertCrmChannelRoutingPolicyInput,
  ) => Promise<CrmChannelRoutingPolicy>;
};
