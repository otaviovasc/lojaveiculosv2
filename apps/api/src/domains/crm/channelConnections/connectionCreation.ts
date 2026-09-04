import type { CrmConnectionCapability } from "@lojaveiculosv2/shared";
import type { CrmChannelConnection } from "./channelConnectionModels.js";

export type CrmChannelConnectionSetupIdentity =
  | { broker: "direct"; channel: "olx_chat"; provider: "olx" }
  | { broker: "direct"; channel: "whatsapp"; provider: "uazapi" }
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
      clientToken: string;
      instanceId: string;
      instanceToken: string;
      provider: "zapi";
      webhookSetupTarget?: {
        basePath: string;
        canonicalApiOrigin: string;
      };
    }
  | {
      channel: "whatsapp";
      displayName: string;
      /** Write-only BYOK admin token, sealed per connection. */
      adminToken: string;
      baseUrl?: string;
      /** Optional phone used for the pair-code connection flow. */
      connectionPhoneNumber?: string;
      mode: "create";
      provider: "uazapi";
      webhookSetupTarget?: {
        basePath: string;
        canonicalApiOrigin: string;
      };
    }
  | {
      channel: "whatsapp";
      displayName: string;
      /** Write-only BYOK admin token, sealed per connection. */
      adminToken: string;
      baseUrl?: string;
      /** Existing instance id; its token is resolved server-side. */
      instanceId: string;
      mode: "attach";
      provider: "uazapi";
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
  allowance: { limit: number; remaining: number; used: number };
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
    identity.broker === "direct" &&
    identity.channel === "whatsapp" &&
    identity.provider === "uazapi"
  ) {
    return {
      ...common,
      conversation_start: true,
      delete: true,
      media: true,
      reactions: true,
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

export const CRM_WHATSAPP_CONNECTION_LIMIT = 3;

export class CrmWhatsappConnectionLimitError extends Error {
  readonly code = "CRM_WHATSAPP_CONNECTION_LIMIT_REACHED" as const;
  constructor(readonly limit: number = CRM_WHATSAPP_CONNECTION_LIMIT) {
    super(
      `The store already has ${limit} active WhatsApp connections. Archive one before creating another.`,
    );
    this.name = "CrmWhatsappConnectionLimitError";
  }
}

export class CrmUazapiInstanceNotFoundError extends Error {
  readonly code = "CRM_UAZAPI_INSTANCE_NOT_FOUND" as const;
  constructor(readonly instanceId: string) {
    super(
      "The uazapi instance was not found in the account behind the supplied admin token.",
    );
    this.name = "CrmUazapiInstanceNotFoundError";
  }
}

export class CrmUazapiConnectionPhoneConflictError extends Error {
  readonly code = "CRM_UAZAPI_CONNECTION_PHONE_CONFLICT" as const;
  constructor() {
    super(
      "Another connection in this store already uses the phone number exposed by the attached uazapi instance.",
    );
    this.name = "CrmUazapiConnectionPhoneConflictError";
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
