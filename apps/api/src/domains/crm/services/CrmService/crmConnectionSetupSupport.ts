import type { BillingQuotaGuard } from "../../../billing/ports/billingQuotaGuard.js";
import type {
  ComposioCrmOnboardingProvider,
  ComposioInstagramOnboardingProvider,
  CrmConnectionCredentialVault,
  CrmZapiSetupCompletionReporter,
  ZapiConnectionSetupProvider,
} from "../../ports/crmConnectionSetupProvider.js";
import { CrmScopeError, type CrmServicePorts } from "./serviceSupport.js";

export function getCrmBillingQuotaGuard(
  ports: CrmServicePorts,
): BillingQuotaGuard {
  if (!ports.billingQuotaGuard) throw new CrmScopeError("billingQuotaGuard");
  return ports.billingQuotaGuard;
}

export function getCrmConnectionCredentialVault(
  ports: CrmServicePorts,
): CrmConnectionCredentialVault {
  if (!ports.crmConnectionCredentialVault) {
    throw new CrmScopeError("crmConnectionCredentialVault");
  }
  return ports.crmConnectionCredentialVault;
}

export function getComposioChannelOnboardingProvider(
  ports: CrmServicePorts,
): ComposioCrmOnboardingProvider {
  if (!ports.composioChannelOnboardingProvider) {
    throw new CrmScopeError("composioChannelOnboardingProvider");
  }
  return ports.composioChannelOnboardingProvider;
}

export function requireComposioInstagramOnboardingProvider(
  provider: ComposioCrmOnboardingProvider,
): ComposioInstagramOnboardingProvider {
  if (!provider.discoverInstagramResources || !provider.subscribeInstagramApp) {
    throw new CrmScopeError("composioInstagramOnboardingProvider");
  }
  return {
    ...provider,
    discoverInstagramResources: provider.discoverInstagramResources,
    subscribeInstagramApp: provider.subscribeInstagramApp,
  };
}

export function getZapiConnectionSetupProvider(
  ports: CrmServicePorts,
): ZapiConnectionSetupProvider {
  if (!ports.zapiConnectionSetupProvider) {
    throw new CrmScopeError("zapiConnectionSetupProvider");
  }
  return ports.zapiConnectionSetupProvider;
}

export function getCrmZapiSetupCompletionReporter(
  ports: CrmServicePorts,
): CrmZapiSetupCompletionReporter | null {
  return ports.crmZapiSetupCompletionReporter ?? null;
}

export function getCrmZapiSupportAuthorizer(ports: CrmServicePorts) {
  if (!ports.crmZapiSupportAuthorizer) {
    throw new CrmScopeError("crmZapiSupportAuthorizer");
  }
  return ports.crmZapiSupportAuthorizer;
}
