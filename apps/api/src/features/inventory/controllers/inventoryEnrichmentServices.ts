import { assertPermission } from "../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import { createApiBrasilVehiclePlateProvider } from "../../../infrastructure/vehicleEnrichment/apiBrasilVehiclePlateProvider.js";
import { createOpenAiVehicleAnalysisProvider } from "../../../infrastructure/vehicleEnrichment/openAiVehicleAnalysisProvider.js";
import type {
  InventoryPlateLookupResponse,
  InventoryResaleAnalysisRequest,
  InventoryResaleAnalysisResponse,
} from "./inventoryEnrichmentTypes.js";

const permission = "inventory.read";

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
  analysisProvider = createOpenAiVehicleAnalysisProvider({
    apiKey: process.env.API_OPENAI_KEY,
    model: process.env.API_OPENAI_MODEL ?? "gpt-5-mini",
  }),
  plateProvider = createApiBrasilVehiclePlateProvider({
    ...(process.env.API_PLACA_BASE_URL
      ? { baseUrl: process.env.API_PLACA_BASE_URL }
      : {}),
    ...(process.env.API_PLACA_DADOS_PATH
      ? { dadosPath: process.env.API_PLACA_DADOS_PATH }
      : {}),
    token: process.env.API_PLACA_KEY,
  }),
}: {
  analysisProvider?: VehicleAnalysisProvider;
  plateProvider?: VehiclePlateProvider;
} = {}): InventoryEnrichmentServices {
  return {
    analyzeResale: (context, input) =>
      withInventoryEnrichmentAudit(
        context,
        "inventory.enrichment.ai_analyze",
        () => analysisProvider.analyze(input),
      ),
    lookupPlate: (context, input) =>
      withInventoryEnrichmentAudit(
        context,
        "inventory.enrichment.plate_lookup",
        () => plateProvider.lookupPlate({ plate: normalizePlate(input.plate) }),
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
