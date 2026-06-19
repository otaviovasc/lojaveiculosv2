import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { VehicleCatalogType } from "../../ports/vehicleCatalogProvider.js";
import {
  applyLimit,
  createCounts,
  normalizeConcurrency,
  runWithConcurrency,
  type CatalogSyncCounts,
} from "../../catalog/syncCatalogSupport.js";
import {
  deriveModelFamilyName,
  getCatalogProvider,
  getCatalogRepository,
  type VehicleCatalogServicePorts,
  vehicleCatalogSyncPermission,
} from "./serviceSupport.js";

export type SyncVehicleCatalogInput = {
  brandLimit?: number | undefined;
  concurrency?: number;
  vehicleType: VehicleCatalogType;
};

export type SyncVehicleCatalogResult = {
  brandsSeen: number;
  modelFamiliesSeen: number;
  skippedYearLookups: number;
  status: "succeeded";
  versionsSeen: number;
  yearsSeen: number;
};

export async function syncVehicleCatalog(
  context: ServiceContext,
  input: SyncVehicleCatalogInput,
  ports?: VehicleCatalogServicePorts,
): Promise<SyncVehicleCatalogResult> {
  assertPermission(context, vehicleCatalogSyncPermission);
  const repository = getCatalogRepository(ports);
  const provider = getCatalogProvider(ports);
  const run = await repository.createSyncRun({
    provider: "fipe",
    vehicleType: input.vehicleType,
  });
  const counts = createCounts();
  context.logger.info(
    "vehicle_catalog.sync.start",
    createServiceLogMetadata(context, {
      concurrency: normalizeConcurrency(input.concurrency),
      runId: run.id,
      vehicleType: input.vehicleType,
    }),
  );

  try {
    const brands = applyLimit(
      await provider.listBrands({ vehicleType: input.vehicleType }),
      input.brandLimit,
    );
    counts.brandsSeen = brands.length;
    const seenFamilies = new Set<string>();
    const skippedYearLookups: string[] = [];
    await runWithConcurrency(
      brands,
      normalizeConcurrency(input.concurrency),
      async (brand) => {
        const savedBrand = await repository.upsertBrand({
          code: brand.code,
          name: brand.name,
          vehicleType: input.vehicleType,
        });
        const versions = await provider.listModels({
          brandCode: brand.code,
          vehicleType: input.vehicleType,
        });
        counts.versionsSeen += versions.length;
        for (const version of versions) {
          const family = await repository.upsertModelFamily({
            brandId: savedBrand.id,
            name: deriveModelFamilyName(version.name),
            vehicleType: input.vehicleType,
          });
          seenFamilies.add(family.id);
          const savedVersion = await repository.upsertVersion({
            brandId: savedBrand.id,
            code: version.code,
            modelFamilyId: family.id,
            name: version.name,
            vehicleType: input.vehicleType,
          });
          const years = await listYearsOrSkip(
            context,
            skippedYearLookups,
            () =>
              provider.listYears({
                brandCode: brand.code,
                modelCode: version.code,
                vehicleType: input.vehicleType,
              }),
            `${brand.code}:${version.code}`,
          );
          counts.yearsSeen += years.length;
          for (const year of years) {
            await repository.upsertYear({
              ...year,
              versionId: savedVersion.id,
            });
          }
        }
      },
    );
    counts.modelFamiliesSeen = seenFamilies.size;
    const metadata = { skippedYearLookups };
    await repository.finishSyncRun({
      counts,
      metadata,
      runId: run.id,
      status: "succeeded",
    });
    await auditSync(context, input.vehicleType, run.id, counts, metadata);
    return {
      ...counts,
      skippedYearLookups: skippedYearLookups.length,
      status: "succeeded",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await repository.finishSyncRun({
      counts,
      errorMessage,
      runId: run.id,
      status: "failed",
    });
    await auditSyncFailure(
      context,
      input.vehicleType,
      run.id,
      counts,
      errorMessage,
    );
    throw error;
  }
}

async function listYearsOrSkip<T>(
  context: ServiceContext,
  skipped: string[],
  read: () => Promise<readonly T[]>,
  key: string,
): Promise<readonly T[]> {
  try {
    return await read();
  } catch (error) {
    skipped.push(key);
    context.logger.warn(
      "vehicle_catalog.sync.year_lookup.skipped",
      createServiceLogMetadata(context, {
        error: error instanceof Error ? error.message : String(error),
        key,
      }),
    );
    return [];
  }
}

async function auditSync(
  context: ServiceContext,
  vehicleType: VehicleCatalogType,
  runId: string,
  counts: CatalogSyncCounts,
  metadata: Record<string, unknown>,
): Promise<void> {
  await context.audit.record({
    action: "vehicle_catalog.sync",
    actor: context.actor,
    category: "data_change",
    entityId: runId,
    entityType: "vehicle_catalog",
    metadata: {
      ...counts,
      ...metadata,
      permission: vehicleCatalogSyncPermission,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: `Synced FIPE catalog for ${vehicleType}`,
    tenantId: context.tenantId,
  });
}

async function auditSyncFailure(
  context: ServiceContext,
  vehicleType: VehicleCatalogType,
  runId: string,
  counts: CatalogSyncCounts,
  errorMessage: string,
): Promise<void> {
  await context.audit.record({
    action: "vehicle_catalog.sync",
    actor: context.actor,
    category: "data_change",
    entityId: runId,
    entityType: "vehicle_catalog",
    metadata: {
      ...counts,
      errorMessage,
      permission: vehicleCatalogSyncPermission,
    },
    outcome: "failed",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: `Failed FIPE catalog sync for ${vehicleType}`,
    tenantId: context.tenantId,
  });
}
