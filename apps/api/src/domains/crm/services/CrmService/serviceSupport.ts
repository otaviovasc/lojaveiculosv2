import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { StoreScopedServiceContext } from "../../../../shared/serviceContext.js";
import { assertEntitlement } from "../../../../shared/authorization.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import { createDisabledCrmWhatsappGateway } from "../../acl/disabledCrmWhatsappGateway.js";
import type { CrmConnectionRepository } from "../../ports/crmConnectionRepository.js";
import {
  createNoopCrmRealtimePublisher,
  type CrmRealtimePublisher,
} from "../../ports/crmRealtimePublisher.js";
import type { CrmRepository } from "../../ports/crmRepository.js";
import type { CrmWebhookEventRepository } from "../../ports/crmWebhookEventRepository.js";
import type { CrmWhatsappGateway } from "../../ports/crmWhatsappGateway.js";
import type { CrmWhatsappRepository } from "../../ports/crmWhatsappRepository.js";
import type {
  VehicleListingRepository,
  VehicleMediaRepository,
  VehicleUnitRepository,
} from "../../../vehicle/ports/vehicleInventoryRepository.js";

export type CrmServicePorts = {
  crmConnectionRepository?: CrmConnectionRepository;
  crmRealtimePublisher?: CrmRealtimePublisher;
  crmRepository: CrmRepository;
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
  assertEntitlement(context as StoreScopedServiceContext, "crm");
  if (!context.storeId) throw new CrmScopeError("storeId");
  if (!context.tenantId) throw new CrmScopeError("tenantId");
  return { storeId: context.storeId, tenantId: context.tenantId };
}

export function getCrmRepository(ports: CrmServicePorts): CrmRepository {
  return ports.crmRepository;
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
