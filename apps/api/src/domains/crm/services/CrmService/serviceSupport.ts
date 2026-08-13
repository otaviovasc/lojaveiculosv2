import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import { assertEntitlement } from "../../../../shared/authorization.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import { createDisabledCrmWhatsappGateway } from "../../acl/disabledCrmWhatsappGateway.js";
import type { CrmBotIntegrationRepository } from "../../ports/crmBotIntegrationRepository.js";
import {
  createNoopCrmBotWebhookDispatcher,
  type CrmBotWebhookDispatcher,
} from "../../ports/crmBotWebhookDispatcher.js";
import type { CrmConnectionRepository } from "../../ports/crmConnectionRepository.js";
import type { CrmOutcomeRepository } from "../../ports/crmOutcomeRepository.js";
import type { CrmPipelineRepository } from "../../ports/crmPipelineRepository.js";
import {
  createNoopCrmRealtimePublisher,
  type CrmRealtimePublisher,
} from "../../ports/crmRealtimePublisher.js";
import type { CrmRepository } from "../../ports/crmRepository.js";
import type { CrmVisitRepository } from "../../ports/crmVisitRepository.js";
import type { CrmWebhookEventRepository } from "../../ports/crmWebhookEventRepository.js";
import type { CrmOlxWebhookSecurity } from "../../ports/crmOlxWebhookSecurity.js";
import type { CrmWhatsappGateway } from "../../ports/crmWhatsappGateway.js";
import type { CrmWhatsappRepository } from "../../ports/crmWhatsappRepository.js";
import type { CrmWhatsappSessionCommandRepository } from "../../ports/crmWhatsappSessionCommandRepository.js";
import type { CrmWhatsappOutboundIntentRepository } from "../../ports/crmWhatsappOutboundIntentRepository.js";
import { CrmScopeError } from "../../crmScopeError.js";
import type { CrmServicePorts } from "./types.js";
export type { CrmServicePorts } from "./types.js";
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

export function isCrmOlxChatEnabled(ports: CrmServicePorts): boolean {
  return ports.crmProviderRuntime?.olxChatEnabled === true;
}

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

export function getCrmOutcomeRepository(
  ports: CrmServicePorts,
): CrmOutcomeRepository {
  if (!ports.crmOutcomeRepository)
    throw new CrmScopeError("crmOutcomeRepository");
  return ports.crmOutcomeRepository;
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
      configureInitialZapiCredentials: async () => ({ status: "not_found" }),
      createConnection: async () => {
        throw new CrmScopeError("crmConnectionRepository");
      },
      upsertOlxConnection: async () => {
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

export function getCrmWhatsappSessionCommandRepository(
  ports: CrmServicePorts,
): CrmWhatsappSessionCommandRepository {
  if (!ports.crmWhatsappSessionCommandRepository) {
    throw new CrmScopeError("crmWhatsappSessionCommandRepository");
  }
  return ports.crmWhatsappSessionCommandRepository;
}

export function getCrmWebhookEventRepository(
  ports: CrmServicePorts,
): CrmWebhookEventRepository {
  if (!ports.crmWebhookEventRepository) {
    throw new CrmScopeError("crmWebhookEventRepository");
  }
  return ports.crmWebhookEventRepository;
}

export function getCrmOlxWebhookSecurity(
  ports: CrmServicePorts,
): CrmOlxWebhookSecurity {
  if (!ports.crmOlxWebhookSecurity) {
    throw new CrmScopeError("crmOlxWebhookSecurity");
  }
  return ports.crmOlxWebhookSecurity;
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
