import { vehicleCatalogRawResponses } from "@lojaveiculosv2/db";
import type { FipeRawResponseCapture } from "../../catalog/fipeVehicleCatalogRaw.js";
import type { DrizzleVehicleCatalogClient } from "./drizzleVehicleCatalogRepository.js";

export function createDrizzleVehicleCatalogRawResponseRecorder(
  db: DrizzleVehicleCatalogClient,
  getSyncRunId: () => string | null,
) {
  return async (input: FipeRawResponseCapture): Promise<void> => {
    await db.insert(vehicleCatalogRawResponses).values({
      brandCode: input.brandCode,
      endpoint: input.endpoint,
      fetchedAt: input.fetchedAt,
      fipeCode: input.fipeCode,
      httpStatus: input.httpStatus,
      modelCode: input.modelCode,
      payload: input.payload,
      provider: input.provider,
      referenceCode: input.referenceCode,
      requestKey: input.requestKey,
      requestPath: input.requestPath,
      syncRunId: getSyncRunId(),
      vehicleType: input.vehicleType,
      yearCode: input.yearCode,
    });
  };
}
