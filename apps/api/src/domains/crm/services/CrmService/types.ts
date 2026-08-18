import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import type { BillingQuotaGuard } from "../../../billing/ports/billingQuotaGuard.js";
import type {
  VehicleListingRepository,
  VehicleMediaRepository,
  VehicleUnitRepository,
} from "../../../vehicle/ports/vehicleInventoryRepository.js";
import type { CrmExternalBotIntegrationRepository } from "../../ports/crmExternalBotIntegrationRepository.js";
import type { CrmAssigneeMembershipRepository } from "../../ports/crmAssigneeMembershipRepository.js";
import type { CrmCanonicalInboundRepository } from "../../ports/crmCanonicalInboundRepository.js";
import type { CrmConnectionRepository } from "../../ports/crmConnectionRepository.js";
import type { CrmRoutingConnectionRepository } from "../../ports/crmRoutingConnectionRepository.js";
import type { CrmRoutingPolicyRepository } from "../../ports/crmRoutingPolicyRepository.js";
import type {
  ComposioCrmOnboardingProvider,
  CrmConnectionCredentialVault,
  CrmZapiSetupCompletionReporter,
  CrmZapiSupportAuthorizer,
  OlxCrmWebhookSetupProvider,
  ZapiConnectionSetupProvider,
} from "../../ports/crmConnectionSetupProvider.js";
import type { CrmOlxWebhookSecurity } from "../../ports/crmOlxWebhookSecurity.js";
import type { CrmOutcomeRepository } from "../../ports/crmOutcomeRepository.js";
import type { CrmPipelineRepository } from "../../ports/crmPipelineRepository.js";
import type { CrmRealtimePublisher } from "../../ports/crmRealtimePublisher.js";
import type { CrmRemoteMediaFetcher } from "../../ports/crmRemoteMediaFetcher.js";
import type { CrmRepository } from "../../ports/crmRepository.js";
import type { CrmVisitRepository } from "../../ports/crmVisitRepository.js";
import type { CrmWebhookEventRepository } from "../../ports/crmWebhookEventRepository.js";
import type { CrmMessagingGateway } from "../../ports/crmMessagingGateway.js";
import type { CrmOutboundIntentRepository } from "../../ports/crmOutboundIntentRepository.js";
import type { CrmConversationRepository } from "../../ports/crmConversationRepository.js";
import type { CrmConversationCycleCommandRepository } from "../../ports/crmConversationCycleCommandRepository.js";
import type { ExternalBotManagerPorts } from "../../bot/ports/externalBotPorts.js";

export type CrmServicePorts = {
  crmAssigneeMembershipRepository?: CrmAssigneeMembershipRepository;
  billingQuotaGuard?: BillingQuotaGuard;
  crmExternalBotIntegrationRepository?: CrmExternalBotIntegrationRepository;
  externalBotManager?: ExternalBotManagerPorts;
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
  composioChannelOnboardingProvider?: ComposioCrmOnboardingProvider;
  crmPipelineRepository?: CrmPipelineRepository;
  crmRealtimePublisher?: CrmRealtimePublisher;
  crmRepository: CrmRepository;
  crmVisitRepository?: CrmVisitRepository;
  crmWebhookEventRepository?: CrmWebhookEventRepository;
  crmMessagingGateway?: CrmMessagingGateway;
  crmMediaFetcher?: CrmRemoteMediaFetcher;
  crmMediaStorage?: ObjectStorage;
  crmOutboundIntentRepository?: CrmOutboundIntentRepository;
  crmConversationRepository?: CrmConversationRepository;
  crmConversationCycleCommandRepository?: CrmConversationCycleCommandRepository;
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
