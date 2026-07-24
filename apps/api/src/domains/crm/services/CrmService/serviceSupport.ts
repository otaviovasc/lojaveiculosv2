import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { StoreScopedServiceContext } from "../../../../shared/serviceContext.js";
import { assertEntitlement } from "../../../../shared/authorization.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import { createDisabledCrmWhatsappGateway } from "../../acl/disabledCrmWhatsappGateway.js";
import type { CrmBotIntegrationRepository } from "../../ports/crmBotIntegrationRepository.js";
import {
  createNoopCrmBotWebhookDispatcher,
  type CrmBotWebhookDispatcher,
} from "../../ports/crmBotWebhookDispatcher.js";
import type { CrmConnectionRepository } from "../../ports/crmConnectionRepository.js";
import type { CrmPipelineRepository } from "../../ports/crmPipelineRepository.js";
import {
  createNoopCrmRealtimePublisher,
  type CrmRealtimePublisher,
} from "../../ports/crmRealtimePublisher.js";
import type { CrmRepository } from "../../ports/crmRepository.js";
import type { CrmVisitRepository } from "../../ports/crmVisitRepository.js";
import type { CrmWebhookEventRepository } from "../../ports/crmWebhookEventRepository.js";
import type { CrmWhatsappGateway } from "../../ports/crmWhatsappGateway.js";
import type { CrmWhatsappRepository } from "../../ports/crmWhatsappRepository.js";
import type {
  VehicleListingRepository,
  VehicleMediaRepository,
  VehicleUnitRepository,
} from "../../../vehicle/ports/vehicleInventoryRepository.js";

export type CrmServicePorts = {
  crmBotIntegrationRepository?: CrmBotIntegrationRepository;
  crmBotWebhookDispatcher?: CrmBotWebhookDispatcher;
  crmConnectionRepository?: CrmConnectionRepository;
  crmPipelineRepository?: CrmPipelineRepository;
  crmRealtimePublisher?: CrmRealtimePublisher;
  crmRepository: CrmRepository;
  crmVisitRepository?: CrmVisitRepository;
  crmWebhookEventRepository?: CrmWebhookEventRepository;
  crmWhatsappGateway?: CrmWhatsappGateway;
  crmWhatsappMediaStorage?: ObjectStorage;
  crmWhatsappRepository?: CrmWhatsappRepository;
  environment?: string;
  transaction?: <T>(
    action: (ports: CrmServicePorts) => Promise<T>,
  ) => Promise<T>;
  vehicleInventory?: {
    listingRepository: VehicleListingRepository;
    mediaRepository: VehicleMediaRepository;
    unitRepository: VehicleUnitRepository;
  };
};

export class CrmLeadNotFoundError extends Error {
  constructor(leadId: string) {
    super(`Lead not found: ${leadId}`);
    this.name = "CrmLeadNotFoundError";
  }
}

export class CrmActivityIdempotencyConflictError extends Error {
  constructor() {
    super(
      "Idempotency key was already used with a different CRM activity payload.",
    );
    this.name = "CrmActivityIdempotencyConflictError";
  }
}

export class CrmPipelineNotFoundError extends Error {
  constructor(pipelineId: string) {
    super(`CRM pipeline not found: ${pipelineId}`);
    this.name = "CrmPipelineNotFoundError";
  }
}

export class CrmPipelineStageNotFoundError extends Error {
  constructor(stageId: string) {
    super(`CRM pipeline stage not found: ${stageId}`);
    this.name = "CrmPipelineStageNotFoundError";
  }
}

export class CrmPipelineDuplicateNameError extends Error {
  constructor(name: string) {
    super(`CRM pipeline name already exists: ${name}`);
    this.name = "CrmPipelineDuplicateNameError";
  }
}

export class CrmPipelineInUseError extends Error {
  constructor(message = "CRM pipeline is in use by active leads.") {
    super(message);
    this.name = "CrmPipelineInUseError";
  }
}

export class CrmVisitNotFoundError extends Error {
  constructor(visitId: string) {
    super(`CRM visit not found: ${visitId}`);
    this.name = "CrmVisitNotFoundError";
  }
}

export class CrmVisitSessionMismatchError extends Error {
  constructor() {
    super("WhatsApp session is not linked to the requested lead.");
    this.name = "CrmVisitSessionMismatchError";
  }
}

export class CrmVisitVehicleNotFoundError extends Error {
  constructor(listingId: string) {
    super(`Vehicle listing not found for CRM visit: ${listingId}`);
    this.name = "CrmVisitVehicleNotFoundError";
  }
}

export class CrmScopeError extends Error {
  constructor(fieldName: string) {
    super(`CRM service requires ${fieldName}.`);
    this.name = "CrmScopeError";
  }
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
      findConnectionById: async () => null,
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
