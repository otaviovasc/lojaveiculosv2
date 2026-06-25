import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { createInventoryFeature } from "./vehicle.controller.js";
import {
  createInventoryTestServices,
  createUserContext,
} from "./vehicle.controller.testSupport.js";
import type { InventoryEnrichmentServices } from "./inventoryEnrichmentServices.js";
import type {
  InventoryPlateLookupResponse,
  InventoryResaleAnalysisResponse,
} from "./inventoryEnrichmentTypes.js";

describe("inventory enrichment controller", () => {
  it("routes plate lookup requests to enrichment services", async () => {
    const enrichmentServices = createEnrichmentServices();
    const app = createEnrichmentTestApp(enrichmentServices);

    const response = await app.request("/api/v1/inventory/enrichment/plate", {
      body: JSON.stringify({ plate: "abc1d23" }),
      method: "POST",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      plate: "ABC1D23",
      source: "apibrasil",
    });
    expect(enrichmentServices.lookupPlate).toHaveBeenCalledWith(
      expect.any(Object),
      { plate: "abc1d23" },
    );
  });

  it("routes resale analysis requests to enrichment services", async () => {
    const enrichmentServices = createEnrichmentServices();
    const app = createEnrichmentTestApp(enrichmentServices);

    const response = await app.request(
      "/api/v1/inventory/enrichment/resale-analysis",
      {
        body: JSON.stringify({
          acquisitionPriceCents: 8200000,
          brand: "Fiat",
          color: "Branca",
          fipePriceCents: 10000000,
          fuel: "Flex",
          manufactureYear: 2023,
          metadata: [],
          mileageKm: 60000,
          model: "Strada",
          modelYear: 2023,
          plate: "ABC1D23",
          recommendedAcquisitionPriceCents: 8200000,
          recommendedSellingPriceCents: 9700000,
          sellingPriceCents: 9600000,
          transmission: "Automatica",
          version: "Ranch",
        }),
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      dealRiskScore: 18,
      riskLevel: "low",
      topics: [{ code: "W" }],
    });
    expect(enrichmentServices.analyzeResale).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ brand: "Fiat", model: "Strada" }),
    );
  });

  it("rejects invalid plate lookup requests before service calls", async () => {
    const enrichmentServices = createEnrichmentServices();
    const app = createEnrichmentTestApp(enrichmentServices);

    const response = await app.request("/api/v1/inventory/enrichment/plate", {
      body: JSON.stringify({ plate: "bad" }),
      method: "POST",
    });

    expect(response.status).toBe(400);
    expect(enrichmentServices.lookupPlate).not.toHaveBeenCalled();
  });
});

function createEnrichmentTestApp(
  enrichmentServices: InventoryEnrichmentServices,
) {
  const app = new Hono();
  app.route(
    "/api/v1/inventory",
    createInventoryFeature({
      contextFactory: createUserContext,
      enrichmentServices,
      services: createInventoryTestServices(),
    }),
  );
  return app;
}

function createEnrichmentServices(): InventoryEnrichmentServices {
  const analysis: InventoryResaleAnalysisResponse = {
    dealRiskScore: 18,
    riskLevel: "low",
    suggestedDescription: "Descricao gerada.",
    summary: "Baixo risco comercial.",
    topics: [
      {
        code: "W",
        message: "Boa margem contra a FIPE.",
        title: "Margem",
        type: "positive",
      },
    ],
  };
  const lookup: InventoryPlateLookupResponse = {
    fipe: null,
    metadata: [],
    plate: "ABC1D23",
    source: "apibrasil",
    vehicle: {
      aspiration: null,
      bodyType: null,
      brand: "Fiat",
      chassis: null,
      city: null,
      color: "Branca",
      engine: null,
      fuel: "Flex",
      manufactureYear: 2023,
      mileageKm: null,
      model: "Strada",
      modelYear: 2023,
      origin: null,
      power: null,
      state: null,
      transmission: null,
      vehicleType: null,
      version: "Ranch",
    },
  };

  return {
    analyzeResale: vi.fn(async () => analysis),
    lookupPlate: vi.fn(async () => lookup),
  };
}
