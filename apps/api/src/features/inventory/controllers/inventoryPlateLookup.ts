import type { BillingQuotaGuard } from "../../../domains/billing/ports/billingQuotaGuard.js";
import { resolvePlateCatalogIdentity } from "../../../domains/vehicle/catalog/resolvePlateCatalogIdentity.js";
import type { VehicleCatalogRepository } from "../../../domains/vehicle/ports/vehicleCatalogRepository.js";
import type { VehiclePlateLookupRepository } from "../../../domains/vehicle/ports/vehicleEnrichmentRepository.js";
import { assertEntitlement } from "../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
  type StoreScopedServiceContext,
} from "../../../shared/serviceContext.js";
import type { InventoryPlateLookupResponse } from "./inventoryEnrichmentTypes.js";
import {
  finalizeFailedProviderCall,
  releaseUnstartedReservation,
  reservePlateLookupUsage,
} from "./inventoryPlateLookupQuota.js";

export type VehiclePlateProvider = {
  lookupPlate: (input: {
    plate: string;
  }) => Promise<InventoryPlateLookupResponse>;
};

export async function lookupPlateWithCache({
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
  if (!context.storeId || !context.tenantId) {
    throw new Error("Plate lookup requires resolved store billing scope.");
  }
  assertEntitlement(context as StoreScopedServiceContext, "plate_lookup");

  if (plateLookupRepository) {
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

  const reservation = await reservePlateLookupUsage({
    context: context as StoreScopedServiceContext,
    quotaGuard,
  });
  if (reservation) {
    try {
      await reservation.markStarted();
    } catch (error) {
      await releaseUnstartedReservation(context, reservation);
      throw error;
    }
  }

  let providerResult: InventoryPlateLookupResponse;
  try {
    providerResult = await plateProvider.lookupPlate({
      plate: normalizedPlate,
    });
  } catch (error) {
    if (reservation) {
      await finalizeFailedProviderCall(context, reservation, error);
    }
    throw error;
  }

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
  try {
    if (plateLookupRepository) {
      await plateLookupRepository.upsert({
        fetchedAt: new Date(),
        plate: normalizePlate(result.plate || normalizedPlate),
        provider: "apibrasil",
        response: result,
        storeId: context.storeId,
        tenantId: context.tenantId,
      });
    }
  } finally {
    await reservation?.finalize("succeeded");
  }
  return result;
}

function normalizePlate(plate: string) {
  return plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
