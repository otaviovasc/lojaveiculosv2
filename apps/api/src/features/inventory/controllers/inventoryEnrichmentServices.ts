import {
  assertEntitlement,
  assertPermission,
} from "../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
  type StoreScopedServiceContext,
} from "../../../shared/serviceContext.js";
import type { VehiclePlateLookupRepository } from "../../../domains/vehicle/ports/vehicleEnrichmentRepository.js";
import type { VehicleCatalogRepository } from "../../../domains/vehicle/ports/vehicleCatalogRepository.js";
import { resolvePlateCatalogIdentity } from "../../../domains/vehicle/catalog/resolvePlateCatalogIdentity.js";
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

export type VehiclePlateProvider = {
  lookupPlate: (input: {
    plate: string;
  }) => Promise<InventoryPlateLookupResponse>;
};

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

function normalizePlate(plate: string) {
  return plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

async function lookupPlateWithCache({
  catalogRepository,
  context,
  plate,
  plateLookupCacheTtlMs,
  plateLookupRepository,
  plateProvider,
  quotaGuard,
}: {
  catalogRepository?: VehicleCatalogRepository | undefined;
  context: ServiceContext;
  plate: string;
  plateLookupCacheTtlMs: number;
  plateLookupRepository?: VehiclePlateLookupRepository | undefined;
  plateProvider: VehiclePlateProvider;
  quotaGuard?: BillingQuotaGuard | undefined;
}) {
  const normalizedPlate = normalizePlate(plate);
  if (plateLookupRepository && context.storeId && context.tenantId) {
    const minFetchedAt = new Date(Date.now() - plateLookupCacheTtlMs);
    const cached = await plateLookupRepository.findLatest({
      minFetchedAt,
      plate: normalizedPlate,
      provider: "apibrasil",
      storeId: context.storeId,
      tenantId: context.tenantId,
    });
    if (cached?.response.lookupVersion === 2) return cached.response;
  }

  if (!context.storeId || !context.tenantId) {
    throw new Error("Plate lookup requires resolved store billing scope.");
  }
  assertEntitlement(context as StoreScopedServiceContext, "plate_lookup");
  await quotaGuard?.assertAvailable({
    quotaKey: "plate_lookup",
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  const providerResult = await plateProvider.lookupPlate({
    plate: normalizedPlate,
  });
  let result = providerResult;
  if (catalogRepository) {
    try {
      result = {
        ...providerResult,
        catalogIdentity: await resolvePlateCatalogIdentity(
          providerResult,
          catalogRepository,
        ),
      };
    } catch (error) {
      context.logger.warn("inventory.enrichment.catalog_identity.failed", {
        ...createServiceLogMetadata(context),
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      result = {
        ...providerResult,
        catalogIdentity: {
          candidates: [],
          catalog: null,
          reason: "catalog_provider_unavailable",
          status: "unresolved",
        },
      };
    }
  }
  if (plateLookupRepository && context.storeId && context.tenantId) {
    await plateLookupRepository.upsert({
      fetchedAt: new Date(),
      plate: normalizePlate(result.plate || normalizedPlate),
      provider: "apibrasil",
      response: result,
      storeId: context.storeId,
      tenantId: context.tenantId,
    });
  }
  return result;
}

function lazy<T>(create: () => T): () => T {
  let value: T | null = null;
  return () => {
    value ??= create();
    return value;
  };
}
