import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import type { BillingQuotaGuard } from "../../../billing/ports/billingQuotaGuard.js";
import type {
  VehicleListingRepository,
  VehicleMediaRepository,
  VehicleUnitRepository,
} from "../../../vehicle/ports/vehicleInventoryRepository.js";
import type { CrmBotIntegrationRepository } from "../../ports/crmBotIntegrationRepository.js";
import type { CrmBotWebhookDispatcher } from "../../ports/crmBotWebhookDispatcher.js";
import type { CrmCanonicalInboundRepository } from "../../ports/crmCanonicalInboundRepository.js";
import type { CrmConnectionRepository } from "../../ports/crmConnectionRepository.js";
import type { CrmRoutingConnectionRepository } from "../../ports/crmRoutingConnectionRepository.js";
import type { CrmRoutingPolicyRepository } from "../../ports/crmRoutingPolicyRepository.js";
import type {
  ComposioWhatsappOnboardingProvider,
  CrmConnectionCredentialVault,
  CrmZapiSetupCompletionReporter,
  CrmZapiSupportAuthorizer,
  OlxCrmWebhookSetupProvider,
  ZapiConnectionSetupProvider,
} from "../../ports/crmConnectionSetupProvider.js";
import type { CrmFinancingBotActions } from "../../ports/crmFinancingBotActions.js";
import type { CrmOlxWebhookSecurity } from "../../ports/crmOlxWebhookSecurity.js";
import type { CrmOutcomeRepository } from "../../ports/crmOutcomeRepository.js";
import type { CrmPipelineRepository } from "../../ports/crmPipelineRepository.js";
import type { CrmRealtimePublisher } from "../../ports/crmRealtimePublisher.js";
import type { CrmRemoteMediaFetcher } from "../../ports/crmRemoteMediaFetcher.js";
import type { CrmRepository } from "../../ports/crmRepository.js";
import type { CrmVisitRepository } from "../../ports/crmVisitRepository.js";
import type { CrmWebhookEventRepository } from "../../ports/crmWebhookEventRepository.js";
import type { CrmWhatsappGateway } from "../../ports/crmWhatsappGateway.js";
import type { CrmWhatsappOutboundIntentRepository } from "../../ports/crmWhatsappOutboundIntentRepository.js";
import type { CrmWhatsappRepository } from "../../ports/crmWhatsappRepository.js";
import type { CrmWhatsappSessionCommandRepository } from "../../ports/crmWhatsappSessionCommandRepository.js";

export type CrmServicePorts = {
  billingQuotaGuard?: BillingQuotaGuard;
  crmBotIntegrationRepository?: CrmBotIntegrationRepository;
  crmBotWebhookDispatcher?: CrmBotWebhookDispatcher;
  crmCanonicalInboundRepository?: CrmCanonicalInboundRepository;
  crmConnectionRepository?: CrmConnectionRepository;
  crmRoutingConnectionRepository?: CrmRoutingConnectionRepository;
  crmRoutingPolicyRepository?: CrmRoutingPolicyRepository;
  crmConnectionCredentialVault?: CrmConnectionCredentialVault;
  crmOlxWebhookSecurity?: CrmOlxWebhookSecurity;
  crmOutcomeRepository?: CrmOutcomeRepository;
  olxCrmCallbackOrigin?: string;
  olxCrmWebhookSetupProvider?: OlxCrmWebhookSetupProvider;
  crmProviderRuntime?: {
    olxChatEnabled: boolean;
  };
  crmZapiSetupCompletionReporter?: CrmZapiSetupCompletionReporter;
  crmZapiSupportAuthorizer?: CrmZapiSupportAuthorizer;
  composioWhatsappOnboardingProvider?: ComposioWhatsappOnboardingProvider;
  crmPipelineRepository?: CrmPipelineRepository;
  crmRealtimePublisher?: CrmRealtimePublisher;
  crmRepository: CrmRepository;
  crmVisitRepository?: CrmVisitRepository;
  crmWebhookEventRepository?: CrmWebhookEventRepository;
  crmWhatsappGateway?: CrmWhatsappGateway;
  crmWhatsappMediaFetcher?: CrmRemoteMediaFetcher;
  crmWhatsappMediaStorage?: ObjectStorage;
  crmWhatsappOutboundIntentRepository?: CrmWhatsappOutboundIntentRepository;
  crmWhatsappRepository?: CrmWhatsappRepository;
  crmWhatsappSessionCommandRepository?: CrmWhatsappSessionCommandRepository;
  financingBotActions?: CrmFinancingBotActions;
  environment?: string;
  transaction?: <T>(
    action: (ports: CrmServicePorts) => Promise<T>,
  ) => Promise<T>;
  vehicleInventory?: {
    listingRepository: VehicleListingRepository;
    mediaRepository: VehicleMediaRepository;
    unitRepository: VehicleUnitRepository;
  };
  zapiConnectionSetupProvider?: ZapiConnectionSetupProvider;
};
