import { assertPermission } from "../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import type { VehiclePlateLookupRepository } from "../../../domains/vehicle/ports/vehicleEnrichmentRepository.js";
import type { VehicleCatalogRepository } from "../../../domains/vehicle/ports/vehicleCatalogRepository.js";
import type { BillingQuotaGuard } from "../../../domains/billing/ports/billingQuotaGuard.js";
import type {
  InventoryPlateLookupResponse,
  InventoryResaleAnalysisRequest,
  InventoryResaleAnalysisResponse,
} from "./inventoryEnrichmentTypes.js";
import {
  createDefaultInventoryAnalysisProvider,
  createDefaultInventoryPlateProvider,
} from "./inventoryEnrichmentProviders.js";
import {
  lookupPlateWithCache,
  type VehiclePlateProvider,
} from "./inventoryPlateLookup.js";

const permission = "inventory.read";
const defaultPlateLookupCacheTtlMs = 30 * 24 * 60 * 60 * 1000;

export type InventoryEnrichmentServices = {
  analyzeResale: (
    context: ServiceContext,
    input: InventoryResaleAnalysisRequest,
  ) => Promise<InventoryResaleAnalysisResponse>;
  lookupPlate: (
    context: ServiceContext,
    input: { plate: string },
  ) => Promise<InventoryPlateLookupResponse>;
};

export type VehicleAnalysisProvider = {
  analyze: (
    input: InventoryResaleAnalysisRequest,
  ) => Promise<InventoryResaleAnalysisResponse>;
};

export type { VehiclePlateProvider } from "./inventoryPlateLookup.js";

export function createInventoryEnrichmentServices({
  analysisProvider,
  catalogRepository,
  plateLookupCacheTtlMs = defaultPlateLookupCacheTtlMs,
  plateLookupRepository,
  plateProvider,
  quotaGuard,
}: {
  analysisProvider?: VehicleAnalysisProvider;
  catalogRepository?: VehicleCatalogRepository;
  plateLookupCacheTtlMs?: number;
  plateLookupRepository?: VehiclePlateLookupRepository;
  plateProvider?: VehiclePlateProvider;
  quotaGuard?: BillingQuotaGuard;
} = {}): InventoryEnrichmentServices {
  const getAnalysisProvider = analysisProvider
    ? () => analysisProvider
    : lazy(createDefaultInventoryAnalysisProvider);
  const getPlateProvider = plateProvider
    ? () => plateProvider
    : lazy(createDefaultInventoryPlateProvider);

  return {
    analyzeResale: (context, input) =>
      withInventoryEnrichmentAudit(
        context,
        "inventory.enrichment.ai_analyze",
        () => getAnalysisProvider().analyze(input),
      ),
    lookupPlate: (context, input) =>
      withInventoryEnrichmentAudit(
        context,
        "inventory.enrichment.plate_lookup",
        () =>
          lookupPlateWithCache({
            catalogRepository,
            context,
            plate: input.plate,
            plateLookupCacheTtlMs,
            plateLookupRepository,
            plateProvider: getPlateProvider(),
            quotaGuard,
          }),
      ),
  };
}

export const inventoryEnrichmentServices = createInventoryEnrichmentServices();

async function withInventoryEnrichmentAudit<T>(
  context: ServiceContext,
  action: string,
  run: () => Promise<T>,
) {
  assertPermission(context, permission);
  context.logger.info(
    action,
    createServiceLogMetadata(context, { permission }),
  );

  try {
    const result = await run();
    await context.audit.record({
      action,
      actor: context.actor,
      category: "integration",
      entityId: context.storeId ?? context.tenantId ?? context.actor.id,
      entityType: "inventory_enrichment",
      metadata: { permission },
      outcome: "succeeded",
      requestId: context.requestId,
      storeId: context.storeId,
      summary: "Inventory enrichment request completed",
      tenantId: context.tenantId,
    });
    return result;
  } catch (error) {
    await context.audit.record({
      action,
      actor: context.actor,
      category: "integration",
      entityId: context.storeId ?? context.tenantId ?? context.actor.id,
      entityType: "inventory_enrichment",
      metadata: {
        errorName: error instanceof Error ? error.name : "UnknownError",
        permission,
      },
      outcome: "failed",
      requestId: context.requestId,
      storeId: context.storeId,
      summary: "Inventory enrichment request failed",
      tenantId: context.tenantId,
    });
    throw error;
  }
}

function lazy<T>(create: () => T): () => T {
  let value: T | null = null;
  return () => {
    value ??= create();
    return value;
  };
}
