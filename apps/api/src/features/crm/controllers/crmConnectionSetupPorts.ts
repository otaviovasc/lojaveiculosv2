import type {
  ComposioCrmOnboardingProvider,
  CrmConnectionCredentialVault,
  CrmZapiSupportAuthorizer,
  OlxCrmWebhookSetupProvider,
  UazapiConnectionSetupProvider,
  ZapiConnectionSetupProvider,
} from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import { CrmZapiSetupNotEligibleError } from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import type { CrmUazapiProvisioningProvider } from "../../../domains/crm/ports/crmUazapiProvisioningProvider.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { createComposioCrmConnectionSetupProvider } from "../../../infrastructure/crm/composioCrmConnectionSetupProvider.js";
import { createCrmConnectionCredentialVault } from "../../../infrastructure/crm/crmConnectionCredentialVault.js";
import { createUazapiCrmConnectionSetupProvider } from "../../../infrastructure/crm/uazapiCrmConnectionSetupProvider.js";
import { createUazapiCrmProvisioningProvider } from "../../../infrastructure/crm/uazapiCrmProvisioningProvider.js";
import { createZapiCrmConnectionSetupProvider } from "../../../infrastructure/crm/zapiCrmConnectionSetupProvider.js";
import { createOlxCrmWebhookSetupProvider } from "../../../infrastructure/crm/olxCrmWebhookSetupProvider.js";
import { createDrizzleBillingRepository } from "../../../infrastructure/db/billing/drizzleBillingRepository.js";
import type { DrizzleCrmClient } from "../../../infrastructure/db/crm/drizzleCrmRepository.js";

type ConnectionSetupPorts = Pick<
  CrmServicePorts,
  | "composioChannelOnboardingProvider"
  | "crmConnectionCredentialVault"
  | "crmUazapiProvisioningProvider"
  | "crmZapiSupportAuthorizer"
  | "olxCrmWebhookSetupProvider"
  | "uazapiConnectionSetupProvider"
  | "zapiConnectionSetupProvider"
>;

export function createCrmConnectionSetupPorts(
  drizzleClient?: DrizzleCrmClient,
): ConnectionSetupPorts {
  const credentialVault: CrmConnectionCredentialVault = {
    open: (input) => createCrmConnectionCredentialVault().open(input),
    seal: (input) => createCrmConnectionCredentialVault().seal(input),
  };
  const composio: ComposioCrmOnboardingProvider = {
    createConnectLink: (input) =>
      createComposioCrmConnectionSetupProvider().createConnectLink(input),
    discoverInstagramResources: (connectedAccountId) =>
      createComposioCrmConnectionSetupProvider().discoverInstagramResources(
        connectedAccountId,
      ),
    discoverWhatsappResources: (connectedAccountId) =>
      createComposioCrmConnectionSetupProvider().discoverWhatsappResources(
        connectedAccountId,
      ),
    subscribeWhatsappApp: (input) =>
      createComposioCrmConnectionSetupProvider().subscribeWhatsappApp(input),
    subscribeInstagramApp: (input) =>
      createComposioCrmConnectionSetupProvider().subscribeInstagramApp(input),
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
  const uazapi: UazapiConnectionSetupProvider = {
    getPairingCode: (credentials, phone) =>
      createUazapiCrmConnectionSetupProvider().getPairingCode(
        credentials,
        phone,
      ),
    getQrCode: (credentials) =>
      createUazapiCrmConnectionSetupProvider().getQrCode(credentials),
    validateStatus: (credentials) =>
      createUazapiCrmConnectionSetupProvider().validateStatus(credentials),
  };
  const uazapiProvisioning: CrmUazapiProvisioningProvider = {
    createInstance: (input) =>
      createUazapiCrmProvisioningProvider().createInstance(input),
    deleteInstance: (input) =>
      createUazapiCrmProvisioningProvider().deleteInstance(input),
    listInstances: (input) =>
      createUazapiCrmProvisioningProvider().listInstances(input),
  };
  const olx: OlxCrmWebhookSetupProvider = {
    configureChat: (input) =>
      createOlxCrmWebhookSetupProvider().configureChat(input),
    configureLeads: (input) =>
      createOlxCrmWebhookSetupProvider().configureLeads(input),
  };
  const supportAuthorizer: CrmZapiSupportAuthorizer | undefined = drizzleClient
    ? {
        assertCrmSetupEligible: async (input) => {
          const repository = createDrizzleBillingRepository(drizzleClient);
          if (!(await repository.storeExistsInTenant(input))) {
            throw new CrmZapiSetupNotEligibleError();
          }
          const overview = await repository.getOverview({
            currentActorCanManage: false,
            ...input,
          });
          const eligible = overview.entitlements.some(
            (entitlement) =>
              entitlement.featureKey === "crm" &&
              entitlement.status === "active" &&
              (!entitlement.startsAt || entitlement.startsAt <= new Date()) &&
              (!entitlement.endsAt || entitlement.endsAt > new Date()),
          );
          if (!eligible) throw new CrmZapiSetupNotEligibleError();
        },
      }
    : undefined;
  return {
    composioChannelOnboardingProvider: composio,
    crmConnectionCredentialVault: credentialVault,
    crmUazapiProvisioningProvider: uazapiProvisioning,
    olxCrmWebhookSetupProvider: olx,
    ...(supportAuthorizer
      ? { crmZapiSupportAuthorizer: supportAuthorizer }
      : {}),
    uazapiConnectionSetupProvider: uazapi,
    zapiConnectionSetupProvider: zapi,
  };
}
