import type { VehicleCatalogProvider } from "../ports/vehicleCatalogProvider.js";
import type { VehicleCatalogRepository } from "../ports/vehicleCatalogRepository.js";

export async function syncCatalogReferences(
  provider: VehicleCatalogProvider,
  repository: VehicleCatalogRepository,
  configuredReferenceCode: string | undefined,
): Promise<{ referenceCode: string | undefined; referencesSeen: number }> {
  const references = await provider.listReferences();
  await repository.upsertReferences(
    references.map((reference, index) => ({
      ...reference,
      isLatest: index === 0,
      rawPayload: reference,
    })),
  );
  return {
    referenceCode: configuredReferenceCode ?? references[0]?.code,
    referencesSeen: references.length,
  };
}
