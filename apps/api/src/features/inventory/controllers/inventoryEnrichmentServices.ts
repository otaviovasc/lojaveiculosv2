import {
  assertEntitlement,
  assertPermission,
} from "../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
  type StoreScopedServiceContext,
} from "../../../shared/serviceContext.js";
import { createApiBrasilVehiclePlateProvider } from "../../../infrastructure/vehicleEnrichment/apiBrasilVehiclePlateProvider.js";
import { createOpenAiVehicleAnalysisProvider } from "../../../infrastructure/vehicleEnrichment/openAiVehicleAnalysisProvider.js";
import type { VehiclePlateLookupRepository } from "../../../domains/vehicle/ports/vehicleEnrichmentRepository.js";
import type { BillingQuotaGuard } from "../../../domains/billing/ports/billingQuotaGuard.js";
import type {
  InventoryPlateLookupResponse,
  InventoryResaleAnalysisRequest,
  InventoryResaleAnalysisResponse,
} from "./inventoryEnrichmentTypes.js";

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
  plateLookupCacheTtlMs = defaultPlateLookupCacheTtlMs,
  plateLookupRepository,
  plateProvider,
  quotaGuard,
}: {
  analysisProvider?: VehicleAnalysisProvider;
  plateLookupCacheTtlMs?: number;
  plateLookupRepository?: VehiclePlateLookupRepository;
  plateProvider?: VehiclePlateProvider;
  quotaGuard?: BillingQuotaGuard;
} = {}): InventoryEnrichmentServices {
  const getAnalysisProvider = analysisProvider
    ? () => analysisProvider
    : lazy(createDefaultAnalysisProvider);
  const getPlateProvider = plateProvider
    ? () => plateProvider
    : lazy(createDefaultPlateProvider);

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
  context,
  plate,
  plateLookupCacheTtlMs,
  plateLookupRepository,
  plateProvider,
  quotaGuard,
}: {
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
    if (cached) return cached.response;
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

  const result = await plateProvider.lookupPlate({ plate: normalizedPlate });
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

function createDefaultAnalysisProvider(): VehicleAnalysisProvider {
  return createOpenAiVehicleAnalysisProvider({
    apiKey: process.env.API_OPENAI_KEY,
    model:
      process.env.API_OPENAI_INVENTORY_RESALE_MODEL ??
      process.env.API_OPENAI_DEFAULT_MODEL ??
      process.env.API_OPENAI_MODEL ??
      "gpt-5.4-mini",
  });
}

function createDefaultPlateProvider(): VehiclePlateProvider {
  return createApiBrasilVehiclePlateProvider({
    ...(process.env.API_PLACA_BASE_URL
      ? { baseUrl: process.env.API_PLACA_BASE_URL }
      : {}),
    ...(process.env.API_PLACA_DADOS_PATH
      ? { dadosPath: process.env.API_PLACA_DADOS_PATH }
      : {}),
    token: process.env.API_PLACA_KEY,
  });
}

function lazy<T>(create: () => T): () => T {
  let value: T | null = null;
  return () => {
    value ??= create();
    return value;
  };
}
