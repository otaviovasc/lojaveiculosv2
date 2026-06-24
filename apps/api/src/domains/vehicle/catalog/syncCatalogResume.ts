import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import type { VehicleCatalogProvider } from "../ports/vehicleCatalogProvider.js";
import type { VehicleCatalogRepository } from "../ports/vehicleCatalogRepository.js";

export type VersionYearRefreshInput = {
  refreshAfterDays?: number | undefined;
  refreshExistingYears?: boolean | undefined;
  vehicleType: Parameters<
    VehicleCatalogProvider["listBrands"]
  >[0]["vehicleType"];
};

export async function listModelsOrSkip<T>(
  context: ServiceContext,
  skipped: string[],
  read: () => Promise<readonly T[]>,
  key: string,
): Promise<readonly T[]> {
  return listOrSkip(
    context,
    skipped,
    read,
    key,
    "vehicle_catalog.sync.model_lookup.skipped",
  );
}

export async function listYearsOrSkip<T>(
  context: ServiceContext,
  skipped: string[],
  read: () => Promise<readonly T[]>,
  key: string,
): Promise<readonly T[]> {
  return listOrSkip(
    context,
    skipped,
    read,
    key,
    "vehicle_catalog.sync.year_lookup.skipped",
  );
}

export async function shouldSyncVersionYears(
  repository: VehicleCatalogRepository,
  input: VersionYearRefreshInput,
  version: { brandCode: string; versionCode: string },
): Promise<boolean> {
  if (input.refreshExistingYears) return true;
  const state = await repository.getVersionYearSyncState({
    brandCode: version.brandCode,
    vehicleType: input.vehicleType,
    versionCode: version.versionCode,
  });
  if (!state || state.yearCount === 0 || !state.lastSyncedAt) return true;
  const refreshAfterDays = input.refreshAfterDays ?? 30;
  if (refreshAfterDays <= 0) return false;
  const staleBefore = Date.now() - refreshAfterDays * 24 * 60 * 60 * 1_000;
  return state.lastSyncedAt.getTime() < staleBefore;
}

async function listOrSkip<T>(
  context: ServiceContext,
  skipped: string[],
  read: () => Promise<readonly T[]>,
  key: string,
  event: string,
): Promise<readonly T[]> {
  try {
    return await read();
  } catch (error) {
    skipped.push(key);
    context.logger.warn(
      event,
      createServiceLogMetadata(context, {
        error: error instanceof Error ? error.message : String(error),
        key,
      }),
    );
    return [];
  }
}
