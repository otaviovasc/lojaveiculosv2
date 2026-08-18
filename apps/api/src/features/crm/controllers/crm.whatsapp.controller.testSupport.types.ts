import type { AuditSink } from "@lojaveiculosv2/audit";
import type { EntitlementKey, PermissionKey } from "@lojaveiculosv2/shared";
import type { CrmBotIntegrationRepository } from "../../../domains/crm/ports/crmBotIntegrationRepository.js";
import type { ResolveCrmBotEntitlements } from "../../../domains/crm/ports/crmBotEntitlementResolver.js";
import type { CrmBotWebhookDispatcher } from "../../../domains/crm/ports/crmBotWebhookDispatcher.js";
import type { CrmConnectionRepository } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type {
  CrmConnectionCredentialVault,
  CrmZapiSetupCompletionReporter,
  CrmZapiSupportAuthorizer,
} from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import type { CrmFinancingBotActions } from "../../../domains/crm/ports/crmFinancingBotActions.js";
import type { CrmPipelineRepository } from "../../../domains/crm/ports/crmPipelineRepository.js";
import type {
  CrmRealtimeBroker,
  CrmRealtimePublisher,
} from "../../../domains/crm/ports/crmRealtimePublisher.js";
import type { CrmRemoteMediaFetcher } from "../../../domains/crm/ports/crmRemoteMediaFetcher.js";
import type { CrmRepository } from "../../../domains/crm/ports/crmRepository.js";
import type { CrmVisitRepository } from "../../../domains/crm/ports/crmVisitRepository.js";
import type { CrmWebhookEventRepository } from "../../../domains/crm/ports/crmWebhookEventRepository.js";
import type { CrmWhatsappGateway } from "../../../domains/crm/ports/crmWhatsappGateway.js";
import type { CrmWhatsappRepository } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import type { ServiceLogger } from "../../../shared/serviceContext.js";
import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";

export type CreateCrmWhatsappTestAppOptions = {
  audit?: AuditSink;
  billingQuotaGuard?: CrmServicePorts["billingQuotaGuard"];
  composioWhatsappOnboardingProvider?: CrmServicePorts["composioWhatsappOnboardingProvider"];
  crmBotIntegrationRepository?: CrmBotIntegrationRepository;
  crmBotWebhookDispatcher?: CrmBotWebhookDispatcher;
  crmConnectionCredentialVault?: CrmConnectionCredentialVault;
  crmConnectionRepository?: CrmConnectionRepository;
  crmOlxWebhookSecurity?: CrmServicePorts["crmOlxWebhookSecurity"];
  crmOutcomeRepository?: CrmServicePorts["crmOutcomeRepository"];
  olxCrmWebhookSetupProvider?: CrmServicePorts["olxCrmWebhookSetupProvider"];
  olxCrmCallbackOrigin?: string;
  olxChatEnabled?: boolean;
  crmZapiSetupCompletionReporter?: CrmZapiSetupCompletionReporter;
  crmZapiSupportAuthorizer?: CrmZapiSupportAuthorizer;
  crmPipelineRepository?: CrmPipelineRepository;
  crmRealtimeBroker?: CrmRealtimeBroker;
  crmRealtimePublisher?: CrmRealtimePublisher;
  crmRoutingConnectionRepository?: CrmServicePorts["crmRoutingConnectionRepository"];
  crmRoutingPolicyRepository?: CrmServicePorts["crmRoutingPolicyRepository"];
  crmRepository?: CrmRepository;
  crmVisitRepository?: CrmVisitRepository;
  crmWebhookEventRepository?: CrmWebhookEventRepository;
  crmWhatsappGateway?: Partial<CrmWhatsappGateway>;
  crmWhatsappMediaFetcher?: CrmRemoteMediaFetcher;
  crmWhatsappMediaStorage?: ObjectStorage;
  crmWhatsappRepository?: CrmWhatsappRepository;
  entitlements?: EntitlementKey[];
  financingBotActions?: CrmFinancingBotActions;
  logger?: ServiceLogger;
  permissions?: PermissionKey[];
  supportPermissions?: PermissionKey[];
  resolveBotEntitlements?: ResolveCrmBotEntitlements;
  transaction?: CrmServicePorts["transaction"];
  vehicleInventory?: CrmServicePorts["vehicleInventory"];
  zapiConnectionSetupProvider?: CrmServicePorts["zapiConnectionSetupProvider"];
};
