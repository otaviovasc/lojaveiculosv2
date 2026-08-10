import type {
  ComposioWhatsappOnboardingProvider,
  CrmConnectionCredentialVault,
  CrmZapiSetupCompletionReporter,
  CrmZapiSupportAuthorizer,
  ZapiConnectionSetupProvider,
} from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createComposioCrmConnectionSetupProvider } from "../../../infrastructure/crm/composioCrmConnectionSetupProvider.js";
import { createCrmConnectionCredentialVault } from "../../../infrastructure/crm/crmConnectionCredentialVault.js";
import { createZapiCrmConnectionSetupProvider } from "../../../infrastructure/crm/zapiCrmConnectionSetupProvider.js";
import { completeZapiAddonSetup } from "../../../domains/billing/services/BillingService/zapiAddonContract.js";
import { createDrizzleBillingRepository } from "../../../infrastructure/db/billing/drizzleBillingRepository.js";
import type { DrizzleCrmClient } from "../../../infrastructure/db/crm/drizzleCrmRepository.js";
import { BillingContractUnavailableError } from "../../../domains/billing/ports/billingQuotaGuard.js";

type ConnectionSetupPorts = Pick<
  CrmServicePorts,
  | "composioWhatsappOnboardingProvider"
  | "crmConnectionCredentialVault"
  | "crmZapiSetupCompletionReporter"
  | "crmZapiSupportAuthorizer"
  | "zapiConnectionSetupProvider"
>;

export function createCrmConnectionSetupPorts(
  drizzleClient?: DrizzleCrmClient,
): ConnectionSetupPorts {
  const credentialVault: CrmConnectionCredentialVault = {
    open: (input) => createCrmConnectionCredentialVault().open(input),
    seal: (input) => createCrmConnectionCredentialVault().seal(input),
  };
  const composio: ComposioWhatsappOnboardingProvider = {
    createConnectLink: (input) =>
      createComposioCrmConnectionSetupProvider().createConnectLink(input),
    discoverWhatsappResources: (connectedAccountId) =>
      createComposioCrmConnectionSetupProvider().discoverWhatsappResources(
        connectedAccountId,
      ),
    subscribeWhatsappApp: (input) =>
      createComposioCrmConnectionSetupProvider().subscribeWhatsappApp(input),
    verifyConnectedAccount: (connectedAccountId) =>
      createComposioCrmConnectionSetupProvider().verifyConnectedAccount(
        connectedAccountId,
      ),
  };
  const zapi: ZapiConnectionSetupProvider = {
    getPairingCode: (credentials, phone) =>
      createZapiCrmConnectionSetupProvider().getPairingCode(credentials, phone),
    getQrCode: (credentials) =>
      createZapiCrmConnectionSetupProvider().getQrCode(credentials),
    validateStatus: (credentials) =>
      createZapiCrmConnectionSetupProvider().validateStatus(credentials),
  };
  const reporter: CrmZapiSetupCompletionReporter | undefined = drizzleClient
    ? {
        completeSetup: async (context, input) => {
          await completeZapiAddonSetup(context, input, {
            billingRepository: createDrizzleBillingRepository(drizzleClient),
          });
        },
      }
    : undefined;
  const supportAuthorizer: CrmZapiSupportAuthorizer | undefined = drizzleClient
    ? {
        assertPaidSetupEligible: async (input) => {
          const repository = createDrizzleBillingRepository(drizzleClient);
          if (!(await repository.storeExistsInTenant(input))) {
            throw new BillingContractUnavailableError();
          }
          const overview = await repository.getOverview({
            currentActorCanManage: false,
            ...input,
          });
          const eligible = overview.addonContracts.some(
            (contract) =>
              contract.addonCode === "crm_zapi" &&
              ["active", "paid_awaiting_setup"].includes(contract.status),
          );
          if (!eligible) {
            throw new BillingContractUnavailableError();
          }
        },
      }
    : undefined;
  return {
    composioWhatsappOnboardingProvider: composio,
    crmConnectionCredentialVault: credentialVault,
    ...(reporter ? { crmZapiSetupCompletionReporter: reporter } : {}),
    ...(supportAuthorizer
      ? { crmZapiSupportAuthorizer: supportAuthorizer }
      : {}),
    zapiConnectionSetupProvider: zapi,
  };
}
