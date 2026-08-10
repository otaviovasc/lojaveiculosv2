import type { BillingQuotaAllowance } from "../../billing/ports/billingQuotaGuard.js";
import type { CrmConnectionProvider } from "../ports/crmConnectionRepository.js";
import type { WhatsappConnection } from "./whatsappConnectionModels.js";

export type CreatableWhatsappConnectionProvider = Extract<
  CrmConnectionProvider,
  "zapi" | "composio_whatsapp"
>;

export type CreateWhatsappConnectionInput =
  | {
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
      displayName: string;
      provider: "composio_whatsapp";
    };

export type WhatsappConnectionOverview = {
  allowance: BillingQuotaAllowance;
  availableProviders: readonly CreatableWhatsappConnectionProvider[];
  connections: readonly WhatsappConnection[];
};

export class WhatsappConnectionProviderAlreadyExistsError extends Error {
  readonly provider: CreatableWhatsappConnectionProvider;

  constructor(provider: CreatableWhatsappConnectionProvider) {
    super(`An active ${provider} connection already exists for this store.`);
    this.name = "WhatsappConnectionProviderAlreadyExistsError";
    this.provider = provider;
  }
}
