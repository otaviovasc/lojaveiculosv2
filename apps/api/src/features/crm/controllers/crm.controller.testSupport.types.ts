import type { AuditSink } from "@lojaveiculosv2/audit";
import type { EntitlementKey, PermissionKey } from "@lojaveiculosv2/shared";
import type { CrmExternalBotIntegrationRepository } from "../../../domains/crm/ports/crmExternalBotIntegrationRepository.js";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import type { CrmConnectionRepository } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type {
  CrmConnectionCredentialVault,
  CrmZapiSupportAuthorizer,
} from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import type { CrmPipelineRepository } from "../../../domains/crm/ports/crmPipelineRepository.js";
import type {
  CrmRealtimeBroker,
  CrmRealtimePublisher,
} from "../../../domains/crm/ports/crmRealtimePublisher.js";
import type { CrmRemoteMediaFetcher } from "../../../domains/crm/ports/crmRemoteMediaFetcher.js";
import type { CrmRepository } from "../../../domains/crm/ports/crmRepository.js";
import type { CrmVisitRepository } from "../../../domains/crm/ports/crmVisitRepository.js";
import type { CrmWebhookEventRepository } from "../../../domains/crm/ports/crmWebhookEventRepository.js";
import type { CrmMessagingGateway } from "../../../domains/crm/ports/crmMessagingGateway.js";
import type { CrmConversationRepository } from "../../../domains/crm/ports/crmConversationRepository.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import type { ServiceLogger } from "../../../shared/serviceContext.js";
import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";
import type { CrmPushRepository } from "../../../domains/crm/ports/crmPushRepository.js";
import type { CrmPushPublicConfig } from "./crm.push.routes.js";

export type CreateCrmTestAppOptions = {
  actorDisplayName?: string;
  audit?: AuditSink;
  crmAudioNormalizer?: CrmServicePorts["crmAudioNormalizer"];
  composioChannelOnboardingProvider?: CrmServicePorts["composioChannelOnboardingProvider"];
  crmExternalBotIntegrationRepository?: CrmExternalBotIntegrationRepository;
  crmCanonicalInboundRepository?: CrmServicePorts["crmCanonicalInboundRepository"];
  crmConnectionCredentialVault?: CrmConnectionCredentialVault;
  crmConnectionRepository?: CrmConnectionRepository;
  crmStatisticsReadModel?: CrmServicePorts["crmStatisticsReadModel"];
  crmOlxWebhookSecurity?: CrmServicePorts["crmOlxWebhookSecurity"];
  crmOutcomeRepository?: CrmServicePorts["crmOutcomeRepository"];
  olxCrmWebhookSetupProvider?: CrmServicePorts["olxCrmWebhookSetupProvider"];
  olxCrmCallbackOrigin?: string;
  olxChatEnabled?: boolean;
  crmZapiSupportAuthorizer?: CrmZapiSupportAuthorizer;
  crmPipelineRepository?: CrmPipelineRepository;
  crmPushRepository?: CrmPushRepository;
  crmRealtimeBroker?: CrmRealtimeBroker;
  crmRealtimePublisher?: CrmRealtimePublisher;
  crmRoutingConnectionRepository?: CrmServicePorts["crmRoutingConnectionRepository"];
  crmRoutingPolicyRepository?: CrmServicePorts["crmRoutingPolicyRepository"];
  crmRepository?: CrmRepository;
  crmVisitRepository?: CrmVisitRepository;
  crmWebhookEventRepository?: CrmWebhookEventRepository;
  crmMessagingGateway?: Partial<CrmMessagingGateway>;
  crmMediaFetcher?: CrmRemoteMediaFetcher;
  crmMediaStorage?: ObjectStorage;
  crmConversationRepository?: CrmConversationRepository;
  entitlements?: EntitlementKey[];
  logger?: ServiceLogger;
  permissions?: PermissionKey[];
  pushPublicConfig?: CrmPushPublicConfig;
  supportPermissions?: PermissionKey[];
  resolveBotEntitlements?: ResolveCrmBotEntitlements;
  transaction?: CrmServicePorts["transaction"];
  vehicleInventory?: CrmServicePorts["vehicleInventory"];
  zapiConnectionSetupProvider?: CrmServicePorts["zapiConnectionSetupProvider"];
};
