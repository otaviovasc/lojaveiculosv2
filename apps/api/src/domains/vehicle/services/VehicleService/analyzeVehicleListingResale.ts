import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type { InventoryResaleAnalysisRequest } from "../../ports/vehicleEnrichmentTypes.js";
import type { VehicleListing } from "../../ports/vehicleInventoryRepository.js";
import {
  findScopedListing,
  getListingRepository,
  getOperationsRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.resale_analysis_generate";

export async function analyzeVehicleListingResale(
  context: ServiceContext,
  input: { listingId: string },
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListing> {
  assertPermission(context, permission);
  assertEntitlement(context as StoreScopedServiceContext, "simulations");
  const repository = getListingRepository(ports);
  const listing = await findScopedListing(context, repository, input.listingId);
  const provider = ports?.resaleAnalysisProvider;
  if (!provider) {
    throw new Error("Vehicle resale analysis provider is not configured.");
  }
  const scope = { storeId: context.storeId, tenantId: context.tenantId };
  const units = ports?.unitRepository
    ? await getUnitRepository(ports).listByListingIds({
        ...scope,
        listingIds: [listing.id],
      })
    : [];
  const [costs, acquisition] = await Promise.all([
    ports?.operationsRepository
      ? getOperationsRepository(ports).listCostsByUnitIds({
          ...scope,
          unitIds: units.map((unit) => unit.id),
        })
      : [],
    ports?.acquisitionRepository && units[0]
      ? ports.acquisitionRepository.findUnitAcquisition({
          ...scope,
          unitId: units[0].id,
        })
      : null,
  ]);

  logVehicleServiceEvent(context, "vehicle_listing.resale_analysis.started", {
    listingId: listing.id,
    provider: provider.name,
    providerModel: provider.model,
  });

  try {
    const result = await provider.analyze(
      createListingAnalysisRequest(
        listing,
        units[0] ?? null,
        costs,
        acquisition,
      ),
    );
    const currentListing = await findScopedListing(
      context,
      repository,
      listing.id,
    );
    const updated = await repository.save({
      ...currentListing,
      resaleAnalysis: {
        ...result,
        generatedAt: new Date(),
        provider: { model: provider.model, name: provider.name },
      },
      updatedAt: new Date(),
    });
    await recordAnalysisAudit(context, updated, provider, "succeeded");
    return updated;
  } catch (error) {
    await recordAnalysisAudit(context, listing, provider, "failed", error);
    throw error;
  }
}

function createListingAnalysisRequest(
  listing: VehicleListing,
  unit: { colorName: string | null } | null,
  costs: readonly { amountCents: number; kind: string }[],
  acquisition: {
    acquisitionPriceCents: number | null;
    channel: string;
    customChannelLabel: string | null;
  } | null,
): InventoryResaleAnalysisRequest {
  const fipePriceCents = listing.catalog?.priceCents ?? null;
  const acquisitionCostCents = costs
    .filter((cost) => cost.kind === "acquisition")
    .reduce((total, cost) => total + cost.amountCents, 0);
  return {
    acquisitionPriceCents:
      acquisition?.acquisitionPriceCents ?? (acquisitionCostCents || null),
    bodyType: null,
    brand: listing.catalog?.brandName ?? null,
    city: null,
    color: unit?.colorName ?? null,
    fipePriceCents,
    fuel: listing.catalog?.fuel ?? listing.fuelType,
    manufactureYear: listing.manufactureYear,
    marketContext: null,
    metadata: listing.catalog?.referenceMonth
      ? [{ label: "Referência FIPE", value: listing.catalog.referenceMonth }]
      : [],
    mileageKm: listing.mileageKm,
    model: listing.catalog?.modelName ?? listing.title,
    modelYear: listing.modelYear,
    origin: acquisition
      ? (acquisition.customChannelLabel ?? acquisition.channel)
      : null,
    plate: listing.plate,
    recommendedAcquisitionPriceCents:
      fipePriceCents === null ? null : Math.round(fipePriceCents * 0.82),
    recommendedSellingPriceCents:
      fipePriceCents === null ? null : Math.round(fipePriceCents * 0.97),
    sellingPriceCents: listing.priceCents,
    state: null,
    transmission: listing.transmission,
    vehicleType: listing.catalog?.vehicleType ?? null,
    version: listing.trimName,
  };
}

async function recordAnalysisAudit(
  context: ServiceContext,
  listing: VehicleListing,
  provider: NonNullable<VehicleInventoryServicePorts["resaleAnalysisProvider"]>,
  outcome: "failed" | "succeeded",
  error?: unknown,
) {
  await context.audit.record({
    action: "vehicle_listing.resale_analysis.generate",
    actor: context.actor,
    category: "integration",
    entityId: listing.id,
    entityType: "vehicle_listing",
    metadata: {
      ...(error
        ? { errorName: error instanceof Error ? error.name : "UnknownError" }
        : {}),
      permission,
      providerModel: provider.model,
    },
    outcome,
    provider: { name: provider.name },
    requestId: context.requestId,
    storeId: context.storeId,
    summary:
      outcome === "succeeded"
        ? "Generated vehicle resale analysis"
        : "Vehicle resale analysis generation failed",
    tenantId: context.tenantId,
  });
}
