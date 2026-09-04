import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";

export const ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE = "zapi.instance-id";
export const ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE = "zapi.instance-token";
export const ZAPI_CLIENT_TOKEN_CREDENTIAL_PURPOSE = "zapi.client-token";
export const ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE = "zapi.webhook-secret";
export const CRM_EXTERNAL_BOT_WEBHOOK_SECRET_CREDENTIAL_PURPOSE =
  "crm-bot.webhook-secret";

export type CrmCredentialScope = {
  purpose: string;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CrmConnectionCredentialVault = {
  open: (input: CrmCredentialScope & { sealed: string }) => Promise<string>;
  seal: (input: CrmCredentialScope & { plaintext: string }) => Promise<string>;
};

export type OlxCrmWebhookSetupProvider = {
  configureChat: (input: {
    accessToken: string;
    callbackUrl: string;
  }) => Promise<OlxCrmWebhookSetupDiagnostics | void>;
  configureLeads: (input: {
    accessToken: string;
    callbackUrl: string;
    token: string;
  }) => Promise<OlxCrmWebhookSetupDiagnostics | void>;
};

export type OlxCrmWebhookSetupDiagnostics = {
  httpStatus: number;
  providerRequestId: string | null;
};

export type ZapiSetupCredentials = {
  clientToken: string;
  instanceId: string;
  instanceToken: string;
};

export type ZapiSetupStatus = {
  connected: boolean;
  connectedPhone: string | null;
  smartphoneConnected: boolean | null;
};

export type ZapiPairingResult =
  | { code: string; kind: "code" }
  | {
      challenge: {
        challenge: string;
        rpId: string | null;
        timeoutMs: number | null;
      };
      kind: "challenge";
    };

export const UAZAPI_ADMIN_TOKEN_CREDENTIAL_PURPOSE = "uazapi.admin-token";
export const UAZAPI_BASE_URL_CREDENTIAL_PURPOSE = "uazapi.base-url";
export const UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE = "uazapi.instance-id";
export const UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE = "uazapi.instance-token";
export const UAZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE = "uazapi.webhook-secret";

export type UazapiSetupCredentials = {
  apiBaseUrl: string;
  instanceId: string;
  instanceToken: string;
};

export type UazapiConnectionSetupProvider = {
  getPairingCode: (
    credentials: UazapiSetupCredentials,
    phone: string,
  ) => Promise<ZapiPairingResult>;
  getQrCode: (
    credentials: UazapiSetupCredentials,
  ) => Promise<{ dataUri: string; expiresInSeconds: number }>;
  validateStatus: (
    credentials: UazapiSetupCredentials,
  ) => Promise<ZapiSetupStatus>;
};

export type ZapiConnectionSetupProvider = {
  getPairingCode: (
    credentials: ZapiSetupCredentials,
    phone: string,
  ) => Promise<ZapiPairingResult>;
  getQrCode: (
    credentials: ZapiSetupCredentials,
  ) => Promise<{ dataUri: string; expiresInSeconds: number }>;
  validateStatus: (
    credentials: ZapiSetupCredentials,
  ) => Promise<ZapiSetupStatus>;
};

export type CrmZapiSupportAuthorizer = {
  assertCrmSetupEligible: (input: {
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<void>;
};

export class CrmZapiSetupNotEligibleError extends Error {
  constructor() {
    super("The store is not eligible for Z-API setup.");
    this.name = "CrmZapiSetupNotEligibleError";
  }
}

export type ComposioConnectLink = {
  connectedAccountId: string;
  expiresAt: string;
  redirectUrl: string;
};

export type ComposioConnectedAccount = {
  connectedAccountId: string;
  status: "active" | "failed" | "pending";
  statusReason: string | null;
  toolkit: string | null;
};

export type ComposioWhatsappBusinessAccount = {
  id: string;
  name: string | null;
};

export type ComposioWhatsappPhone = {
  businessAccountId: string;
  displayName: string | null;
  id: string;
  phone: string | null;
};

export type ComposioWhatsappDiscovery = {
  businessAccounts: readonly ComposioWhatsappBusinessAccount[];
  phones: readonly ComposioWhatsappPhone[];
};

export type ComposioInstagramSender = {
  accountType: "BUSINESS" | "CREATOR" | null;
  displayName: string | null;
  loginMode: ComposioInstagramLoginMode;
  pageId: string | null;
  pageName: string | null;
  senderId: string;
  subscriptionFields: readonly string[];
  subscriptionTargetId: string;
  username: string | null;
};

export type ComposioInstagramDiscovery = {
  senders: readonly ComposioInstagramSender[];
};

export type ComposioCrmChannel = "instagram" | "whatsapp";

export type ComposioInstagramLoginMode = "facebook" | "instagram";

export const composioInstagramWebhookFields = {
  facebook: ["messages"],
  instagram: ["messages", "messaging_postbacks"],
} as const satisfies Record<ComposioInstagramLoginMode, readonly string[]>;

export type ComposioInstagramSubscriptionEvidence = {
  fields: readonly string[];
  subscribed: true;
  targetId: string;
};

export type ComposioCrmOnboardingProvider = {
  createConnectLink: (input: {
    alias?: string;
    callbackUrl?: string;
    channel: ComposioCrmChannel;
    userId: string;
  }) => Promise<ComposioConnectLink>;
  discoverInstagramResources?: (
    connectedAccountId: string,
  ) => Promise<ComposioInstagramDiscovery>;
  discoverWhatsappResources: (
    connectedAccountId: string,
  ) => Promise<ComposioWhatsappDiscovery>;
  subscribeInstagramApp?: (input: {
    connectedAccountId: string;
    senderId: string;
    subscriptionTargetId: string;
  }) => Promise<ComposioInstagramSubscriptionEvidence>;
  subscribeWhatsappApp: (input: {
    businessAccountId: string;
    connectedAccountId: string;
  }) => Promise<{ subscribed: true }>;
  verifyConnectedAccount: (
    connectedAccountId: string,
  ) => Promise<ComposioConnectedAccount>;
};

export type ComposioInstagramOnboardingProvider =
  ComposioCrmOnboardingProvider &
    Required<
      Pick<
        ComposioCrmOnboardingProvider,
        "discoverInstagramResources" | "subscribeInstagramApp"
      >
    >;

export type CrmConnectionSetupProviderErrorCode =
  | "configuration_error"
  | "invalid_provider_response"
  | "pairing_disconnect_required"
  | "pairing_method_required"
  | "provider_outcome_indeterminate"
  | "provider_rejected"
  | "rate_limited"
  | "request_failed"
  | "timeout";

export class CrmConnectionSetupProviderError extends Error {
  constructor(
    message: string,
    readonly code: CrmConnectionSetupProviderErrorCode,
    readonly httpStatus?: number,
    readonly retryAfterSeconds?: number,
    readonly providerRequestId?: string,
    readonly retryable?: boolean,
  ) {
    super(message);
    this.name = "CrmConnectionSetupProviderError";
  }
}
