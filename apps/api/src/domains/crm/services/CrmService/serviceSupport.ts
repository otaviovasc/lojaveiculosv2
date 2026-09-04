import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import { assertEntitlement } from "../../../../shared/authorization.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import { createDisabledCrmMessagingGateway } from "../../acl/disabledCrmMessagingGateway.js";
import type { CrmExternalBotIntegrationRepository } from "../../ports/crmExternalBotIntegrationRepository.js";
import type { CrmAssigneeMembershipRepository } from "../../ports/crmAssigneeMembershipRepository.js";
import type { CrmConnectionRepository } from "../../ports/crmConnectionRepository.js";
import type { CrmRoutingConnectionRepository } from "../../ports/crmRoutingConnectionRepository.js";
import type { CrmRoutingPolicyRepository } from "../../ports/crmRoutingPolicyRepository.js";
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
import type { CrmMessagingGateway } from "../../ports/crmMessagingGateway.js";
import type { CrmConversationRepository } from "../../ports/crmConversationRepository.js";
import type { CrmConversationCycleCommandRepository } from "../../ports/crmConversationCycleCommandRepository.js";
import type { CrmOutboundIntentRepository } from "../../ports/crmOutboundIntentRepository.js";
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

export function getCrmOutboundIntentRepository(
  ports: CrmServicePorts,
): CrmOutboundIntentRepository {
  if (!ports.crmOutboundIntentRepository) {
    throw new Error("CRM outbound intent repository is unavailable.");
  }
  return ports.crmOutboundIntentRepository;
}

export function requireCrmScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  if (!context.storeId) throw new CrmScopeError("storeId");
  if (!context.tenantId) throw new CrmScopeError("tenantId");
  return { storeId: context.storeId, tenantId: context.tenantId };
}

export function requireCrmMessagingScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  assertEntitlement(context as StoreScopedServiceContext, "crm");
  return requireCrmScope(context);
}

export function getCrmRepository(ports: CrmServicePorts): CrmRepository {
  return ports.crmRepository;
}

export function getCrmAssigneeMembershipRepository(
  ports: CrmServicePorts,
): CrmAssigneeMembershipRepository {
  if (!ports.crmAssigneeMembershipRepository) {
    throw new CrmScopeError("crmAssigneeMembershipRepository");
  }
  return ports.crmAssigneeMembershipRepository;
}

export function getCrmOutcomeRepository(
  ports: CrmServicePorts,
): CrmOutcomeRepository {
  if (!ports.crmOutcomeRepository)
    throw new CrmScopeError("crmOutcomeRepository");
  return ports.crmOutcomeRepository;
}

export function getCrmExternalBotIntegrationRepository(
  ports: CrmServicePorts,
): CrmExternalBotIntegrationRepository {
  if (!ports.crmExternalBotIntegrationRepository) {
    throw new CrmScopeError("crmExternalBotIntegrationRepository");
  }
  return ports.crmExternalBotIntegrationRepository;
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
  ports: Pick<CrmServicePorts, "crmConnectionRepository">,
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

export function getCrmRoutingConnectionRepository(
  ports: Pick<CrmServicePorts, "crmRoutingConnectionRepository">,
): CrmRoutingConnectionRepository {
  if (!ports.crmRoutingConnectionRepository) {
    throw new CrmScopeError("crmRoutingConnectionRepository");
  }
  return ports.crmRoutingConnectionRepository;
}

export function getCrmRoutingPolicyRepository(
  ports: Pick<CrmServicePorts, "crmRoutingPolicyRepository">,
): CrmRoutingPolicyRepository {
  if (!ports.crmRoutingPolicyRepository) {
    throw new CrmScopeError("crmRoutingPolicyRepository");
  }
  return ports.crmRoutingPolicyRepository;
}

export function getCrmMessagingGateway(
  ports: CrmServicePorts,
): CrmMessagingGateway {
  return ports.crmMessagingGateway ?? createDisabledCrmMessagingGateway();
}

export function getCrmMediaStorage(
  ports: CrmServicePorts,
): ObjectStorage | null {
  return ports.crmMediaStorage ?? null;
}

export function getCrmConversationRepository(
  ports: CrmServicePorts,
): CrmConversationRepository {
  if (!ports.crmConversationRepository) {
    throw new CrmScopeError("crmConversationRepository");
  }
  return ports.crmConversationRepository;
}

export function getCrmConversationCycleCommandRepository(
  ports: CrmServicePorts,
): CrmConversationCycleCommandRepository {
  if (!ports.crmConversationCycleCommandRepository) {
    throw new CrmScopeError("crmConversationCycleCommandRepository");
  }
  return ports.crmConversationCycleCommandRepository;
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
