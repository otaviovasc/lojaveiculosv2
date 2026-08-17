import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export const crmRoutingChannels = [
  "whatsapp",
  "instagram",
  "olx_chat",
] as const;

export type CrmRoutingChannel = (typeof crmRoutingChannels)[number];
export type CrmBotRoutingMode =
  "disabled" | "inherit_store_default" | "explicit_connection";

export type CrmChannelRoutingPolicy = {
  botConnectionId: string | null;
  botMode: CrmBotRoutingMode;
  channel: CrmRoutingChannel;
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
  botConnectionId: string | null;
  botMode: CrmBotRoutingMode;
  channel: CrmRoutingChannel;
  defaultConnectionId: string | null;
};

export type CrmRoutingPolicyRepository = {
  listPolicies: (
    scope: CrmRoutingPolicyScope,
  ) => Promise<readonly CrmChannelRoutingPolicy[]>;
  upsertPolicy: (
    input: UpsertCrmChannelRoutingPolicyInput,
  ) => Promise<CrmChannelRoutingPolicy>;
};
