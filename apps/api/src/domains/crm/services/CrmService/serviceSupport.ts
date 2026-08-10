import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import { assertEntitlement } from "../../../../shared/authorization.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import type { BillingQuotaGuard } from "../../../billing/ports/billingQuotaGuard.js";
import { createDisabledCrmWhatsappGateway } from "../../acl/disabledCrmWhatsappGateway.js";
import type { CrmBotIntegrationRepository } from "../../ports/crmBotIntegrationRepository.js";
import {
  createNoopCrmBotWebhookDispatcher,
  type CrmBotWebhookDispatcher,
} from "../../ports/crmBotWebhookDispatcher.js";
import type { CrmConnectionRepository } from "../../ports/crmConnectionRepository.js";
import type {
  ComposioWhatsappOnboardingProvider,
  CrmConnectionCredentialVault,
  CrmZapiSetupCompletionReporter,
  CrmZapiSupportAuthorizer,
  ZapiConnectionSetupProvider,
} from "../../ports/crmConnectionSetupProvider.js";
import type { CrmPipelineRepository } from "../../ports/crmPipelineRepository.js";
import {
  createNoopCrmRealtimePublisher,
  type CrmRealtimePublisher,
} from "../../ports/crmRealtimePublisher.js";
import type { CrmRepository } from "../../ports/crmRepository.js";
import type { CrmVisitRepository } from "../../ports/crmVisitRepository.js";
import type { CrmWebhookEventRepository } from "../../ports/crmWebhookEventRepository.js";
import type { CrmWhatsappGateway } from "../../ports/crmWhatsappGateway.js";
import type { CrmRemoteMediaFetcher } from "../../ports/crmRemoteMediaFetcher.js";
import type { CrmWhatsappRepository } from "../../ports/crmWhatsappRepository.js";
import type { CrmWhatsappOutboundIntentRepository } from "../../ports/crmWhatsappOutboundIntentRepository.js";
import type { CrmFinancingBotActions } from "../../ports/crmFinancingBotActions.js";
import type {
  VehicleListingRepository,
  VehicleMediaRepository,
  VehicleUnitRepository,
} from "../../../vehicle/ports/vehicleInventoryRepository.js";
import { CrmScopeError } from "../../crmScopeError.js";
export { CrmScopeError } from "../../crmScopeError.js";
export {
  CrmPipelineDuplicateNameError,
  CrmPipelineInUseError,
  CrmPipelineStageNotFoundError,
  CrmVisitNotFoundError,
  CrmVisitSessionMismatchError,
  CrmVisitVehicleNotFoundError,
} from "../../crmServiceDomainErrors.js";

export {
  CrmActivityIdempotencyConflictError,
  CrmLeadNotFoundError,
  CrmPipelineNotFoundError,
} from "./crmServiceErrors.js";

export type CrmServicePorts = {
  billingQuotaGuard?: BillingQuotaGuard;
  crmBotIntegrationRepository?: CrmBotIntegrationRepository;
  crmBotWebhookDispatcher?: CrmBotWebhookDispatcher;
  crmConnectionRepository?: CrmConnectionRepository;
  crmConnectionCredentialVault?: CrmConnectionCredentialVault;
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

export function getCrmWhatsappOutboundIntentRepository(
  ports: CrmServicePorts,
): CrmWhatsappOutboundIntentRepository {
  if (!ports.crmWhatsappOutboundIntentRepository) {
    throw new Error("CRM WhatsApp outbound intent repository is unavailable.");
  }
  return ports.crmWhatsappOutboundIntentRepository;
}

export function requireCrmScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  if (!context.storeId) throw new CrmScopeError("storeId");
  if (!context.tenantId) throw new CrmScopeError("tenantId");
  return { storeId: context.storeId, tenantId: context.tenantId };
}

export function requireCrmWhatsappScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  assertEntitlement(context as StoreScopedServiceContext, "crm");
  return requireCrmScope(context);
}

export function getCrmRepository(ports: CrmServicePorts): CrmRepository {
  return ports.crmRepository;
}

export function getCrmBotIntegrationRepository(
  ports: CrmServicePorts,
): CrmBotIntegrationRepository {
  if (!ports.crmBotIntegrationRepository) {
    throw new CrmScopeError("crmBotIntegrationRepository");
  }
  return ports.crmBotIntegrationRepository;
}

export function getCrmBotWebhookDispatcher(
  ports: CrmServicePorts,
): CrmBotWebhookDispatcher {
  return ports.crmBotWebhookDispatcher ?? createNoopCrmBotWebhookDispatcher();
}

export function getCrmVisitRepository(
  ports: CrmServicePorts,
): CrmVisitRepository {
  if (!ports.crmVisitRepository) {
    throw new CrmScopeError("crmVisitRepository");
  }
  return ports.crmVisitRepository;
}

export function getCrmPipelineRepository(
  ports: CrmServicePorts,
): CrmPipelineRepository {
  if (!ports.crmPipelineRepository) {
    throw new CrmScopeError("crmPipelineRepository");
  }
  return ports.crmPipelineRepository;
}

export function getCrmRealtimePublisher(
  ports: CrmServicePorts,
): CrmRealtimePublisher {
  return ports.crmRealtimePublisher ?? createNoopCrmRealtimePublisher();
}

export function getCrmConnectionRepository(
  ports: CrmServicePorts,
): CrmConnectionRepository {
  if (!ports.crmConnectionRepository) {
    return {
      archiveAbandonedZapiConnections: async () => [],
      claimZapiWebhookSetup: async () => null,
      createConnection: async () => {
        throw new CrmScopeError("crmConnectionRepository");
      },
      findConnectionByExternalId: async () => null,
      findConnectionById: async () => null,
      finishZapiWebhookSetup: async () => null,
      listConnections: async () => [],
      updateConnection: async () => null,
    };
  }
  return ports.crmConnectionRepository;
}

export function getCrmWhatsappGateway(
  ports: CrmServicePorts,
): CrmWhatsappGateway {
  return ports.crmWhatsappGateway ?? createDisabledCrmWhatsappGateway();
}

export function getCrmWhatsappMediaStorage(
  ports: CrmServicePorts,
): ObjectStorage | null {
  return ports.crmWhatsappMediaStorage ?? null;
}

export function getCrmWhatsappRepository(
  ports: CrmServicePorts,
): CrmWhatsappRepository {
  if (!ports.crmWhatsappRepository) {
    throw new CrmScopeError("crmWhatsappRepository");
  }
  return ports.crmWhatsappRepository;
}

export function getCrmWebhookEventRepository(
  ports: CrmServicePorts,
): CrmWebhookEventRepository {
  if (!ports.crmWebhookEventRepository) {
    throw new CrmScopeError("crmWebhookEventRepository");
  }
  return ports.crmWebhookEventRepository;
}

export function getCrmEnvironment(ports: CrmServicePorts): string {
  return ports.environment ?? "test";
}

export function getCrmVehicleInventory(
  ports: CrmServicePorts,
): NonNullable<CrmServicePorts["vehicleInventory"]> {
  if (!ports.vehicleInventory) {
    throw new CrmScopeError("vehicleInventory");
  }
  return ports.vehicleInventory;
}

export function runCrmTransaction<T>(
  ports: CrmServicePorts,
  action: (ports: CrmServicePorts) => Promise<T>,
) {
  return ports.transaction ? ports.transaction(action) : action(ports);
}
