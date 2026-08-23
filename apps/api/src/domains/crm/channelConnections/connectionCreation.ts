import type { BillingQuotaAllowance } from "../../billing/ports/billingQuotaGuard.js";
import type { CrmConnectionCapability } from "@lojaveiculosv2/shared";
import type { CrmChannelConnection } from "./channelConnectionModels.js";

export type CrmChannelConnectionSetupIdentity =
  | { broker: "direct"; channel: "olx_chat"; provider: "olx" }
  | { broker: "direct"; channel: "whatsapp"; provider: "zapi" }
  | {
      broker: "composio";
      channel: "instagram" | "whatsapp";
      provider: "meta_cloud";
    };

export type CreateCrmChannelConnectionInput =
  | {
      channel: "whatsapp";
      displayName: string;
      instanceId: string;
      instanceToken: string;
      provider: "zapi";
      webhookSetupTarget?: {
        basePath: string;
        canonicalApiOrigin: string;
      };
    }
  | {
      channel: "instagram" | "whatsapp";
      displayName: string;
      provider: "meta_cloud";
    };

export type CrmChannelConnectionOverview = {
  allowance: BillingQuotaAllowance;
  availableSetups: readonly CrmChannelConnectionSetupIdentity[];
  connections: readonly CrmChannelConnection[];
};

export function crmChannelConnectionCapabilityFacts(
  identity: CrmChannelConnectionSetupIdentity,
): Readonly<Record<CrmConnectionCapability, boolean>> {
  const common = {
    catalog: false,
    conversation_start: false,
    delete: false,
    inbound: true,
    media: false,
    outbound: true,
    reactions: false,
    scheduling: false,
    templates: false,
    text: true,
  };
  if (
    identity.broker === "direct" &&
    identity.channel === "whatsapp" &&
    identity.provider === "zapi"
  ) {
    return {
      ...common,
      catalog: true,
      conversation_start: true,
      delete: true,
      media: true,
      reactions: true,
      scheduling: true,
    };
  }
  if (
    identity.broker === "composio" &&
    identity.channel === "whatsapp" &&
    identity.provider === "meta_cloud"
  ) {
    return {
      ...common,
      conversation_start: true,
      media: true,
      templates: true,
    };
  }
  if (
    identity.broker === "composio" &&
    identity.channel === "instagram" &&
    identity.provider === "meta_cloud"
  ) {
    return { ...common, media: true };
  }
  if (
    identity.broker === "direct" &&
    identity.channel === "olx_chat" &&
    identity.provider === "olx"
  ) {
    return common;
  }
  throw new Error("Unsupported CRM channel connection setup identity.");
}

export class CrmChannelConnectionProviderAlreadyExistsError extends Error {
  readonly channel: CrmChannelConnectionSetupIdentity["channel"];
  readonly provider: CrmChannelConnectionSetupIdentity["provider"];

  constructor(
    input: Pick<CrmChannelConnectionSetupIdentity, "channel" | "provider">,
  ) {
    super(
      `An active ${input.provider} connection already exists for ${input.channel}.`,
    );
    this.name = "CrmChannelConnectionProviderAlreadyExistsError";
    this.channel = input.channel;
    this.provider = input.provider;
  }
}

export type CrmZapiIdentityRelation = "same_instance" | "different_instance";
export type CrmZapiConflictAction = "repair_credentials" | "replace_instance";

export class CrmZapiConnectionConflictError extends Error {
  readonly code = "CRM_ZAPI_CONNECTION_REPAIR_REQUIRED" as const;
  constructor(
    readonly details: {
      connectionId: string;
      expectedRevision: number;
      identityRelation: CrmZapiIdentityRelation;
      nextAction: CrmZapiConflictAction;
    },
  ) {
    super(
      details.nextAction === "repair_credentials"
        ? "A Z-API connection already exists and requires credential confirmation."
        : "A different Z-API instance was supplied and requires replacement confirmation.",
    );
    this.name = "CrmZapiConnectionConflictError";
  }
}

export class CrmChannelConnectionCredentialStateError extends Error {
  constructor() {
    super(
      "The initial Z-API credential state is partial and requires support recovery.",
    );
    this.name = "CrmChannelConnectionCredentialStateError";
  }
}
