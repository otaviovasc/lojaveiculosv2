import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";

export const ZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE = "zapi.instance-id";
export const ZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE = "zapi.instance-token";
export const ZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE = "zapi.webhook-secret";
export const CRM_BOT_WEBHOOK_SECRET_CREDENTIAL_PURPOSE =
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
  }) => Promise<void>;
  configureLeads: (input: {
    accessToken: string;
    callbackUrl: string;
    token: string;
  }) => Promise<void>;
};

export type ZapiSetupCredentials = {
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

export type CrmZapiSetupCompletionReporter = {
  completeSetup: (
    context: ServiceContext,
    input: { connectionId: string },
  ) => Promise<void>;
};

export type CrmZapiSupportAuthorizer = {
  assertPaidSetupEligible: (input: {
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<void>;
};

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

export type ComposioWhatsappOnboardingProvider = {
  createConnectLink: (input: {
    alias?: string;
    callbackUrl?: string;
    userId: string;
  }) => Promise<ComposioConnectLink>;
  discoverWhatsappResources: (
    connectedAccountId: string,
  ) => Promise<ComposioWhatsappDiscovery>;
  subscribeWhatsappApp: (input: {
    businessAccountId: string;
    connectedAccountId: string;
  }) => Promise<{ subscribed: true }>;
  verifyConnectedAccount: (
    connectedAccountId: string,
  ) => Promise<ComposioConnectedAccount>;
};

export type CrmConnectionSetupProviderErrorCode =
  | "configuration_error"
  | "invalid_provider_response"
  | "pairing_disconnect_required"
  | "pairing_method_required"
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
  ) {
    super(message);
    this.name = "CrmConnectionSetupProviderError";
  }
}
