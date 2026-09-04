import { describe, expect, it, vi } from "vitest";
import {
  createContext,
  createListing,
} from "../../testSupportVehicleServiceFixtures.js";
import { createInMemoryVehiclePorts } from "../../testSupportVehicleServiceInventoryPorts.js";
import { addVehicleCost } from "./addVehicleCost.js";
import { analyzeVehicleListingResale } from "./analyzeVehicleListingResale.js";
import { attachVehicleUnit } from "./attachVehicleUnit.js";
import { voidVehicleCost } from "./voidVehicleCost.js";

describe("analyzeVehicleListingResale", () => {
  it("persists the provider-identified analysis on the scoped listing", async () => {
    const ports = createInMemoryVehiclePorts([
      createListing({
        catalog: {
          brandCode: "21",
          brandName: "Fiat",
          fipeCode: "001267-0",
          fuel: "Flex",
          modelCode: "4828",
          modelName: "Toro Volcano",
          modelYear: 2024,
          priceCents: 12690000,
          referenceMonth: "julho de 2026",
          source: "fipe",
          vehicleType: "cars",
          yearCode: "2024-1",
          yearName: "2024 Flex",
        },
      }),
    ]);
    const analyze = vi.fn(async () => ({
      dealRiskScore: 28,
      riskLevel: "low" as const,
      suggestedDescription: "Toro com boa liquidez.",
      summary: "Risco comercial controlado.",
      topics: [
        {
          code: "W" as const,
          message: "Boa relação com a FIPE.",
          title: "Margem",
          type: "positive" as const,
        },
      ],
    }));
    ports.resaleAnalysisProvider = {
      analyze,
      model: "openai/gpt-5.4-mini",
      name: "openrouter",
    };
    const context = createContext(["inventory.resale_analysis_generate"]);

    const updated = await analyzeVehicleListingResale(
      context,
      { listingId: "listing_1" },
      ports,
    );

    expect(analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: "Fiat",
        fipePriceCents: 12690000,
        model: "Toro Volcano",
      }),
    );
    expect(updated.resaleAnalysis).toMatchObject({
      dealRiskScore: 28,
      provider: {
        model: "openai/gpt-5.4-mini",
        name: "openrouter",
      },
    });
    expect(context.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "vehicle_listing.resale_analysis.generate",
        entityId: "listing_1",
        outcome: "succeeded",
        provider: { name: "openrouter" },
      }),
    );
  });

  it("excludes voided acquisition costs from the provider request", async () => {
    const ports = createInMemoryVehiclePorts([createListing()]);
    const context = createContext([
      "inventory.create",
      "inventory.cost_create",
      "inventory.cost_void",
      "inventory.resale_analysis_generate",
    ]);
    const unit = await attachVehicleUnit(
      context,
      { listingId: "listing_1" },
      ports,
    );
    await addVehicleCost(
      context,
      { amountCents: 7000000, kind: "acquisition", unitId: unit.id },
      ports,
    );
    const duplicate = await addVehicleCost(
      context,
      { amountCents: 99000000, kind: "acquisition", unitId: unit.id },
      ports,
    );
    await voidVehicleCost(
      context,
      {
        costId: duplicate.id,
        reason: "Custo de aquisicao duplicado",
        unitId: unit.id,
      },
      ports,
    );
    const analyze = vi.fn(async () => ({
      dealRiskScore: 20,
      riskLevel: "low" as const,
      suggestedDescription: "Boa margem.",
      summary: "Aquisicao consistente.",
      topics: [],
    }));
    ports.resaleAnalysisProvider = {
      analyze,
      model: "openai/gpt-5.4-mini",
      name: "openrouter",
    };

    await analyzeVehicleListingResale(
      context,
      { listingId: "listing_1" },
      ports,
    );

    expect(analyze).toHaveBeenCalledWith(
      expect.objectContaining({ acquisitionPriceCents: 7000000 }),
    );
    expect(ports.operationsRepository.costs).toHaveLength(2);
  });

  it("rejects read-only actors before invoking the provider", async () => {
    const ports = createInMemoryVehiclePorts([createListing()]);
    const analyze = vi.fn();
    ports.resaleAnalysisProvider = {
      analyze,
      model: "openai/gpt-5.4-mini",
      name: "openrouter",
    };

    await expect(
      analyzeVehicleListingResale(
        createContext(["inventory.read"]),
        { listingId: "listing_1" },
        ports,
      ),
    ).rejects.toThrow("Missing permission: inventory.resale_analysis_generate");
    expect(analyze).not.toHaveBeenCalled();
  });

  it("rejects stores without AI access before invoking the provider", async () => {
    const ports = createInMemoryVehiclePorts([createListing()]);
    const analyze = vi.fn();
    ports.resaleAnalysisProvider = {
      analyze,
      model: "openai/gpt-5.4-mini",
      name: "openrouter",
    };
    const context = createContext(["inventory.resale_analysis_generate"]);
    context.entitlements = [];

    await expect(
      analyzeVehicleListingResale(context, { listingId: "listing_1" }, ports),
    ).rejects.toThrow("Missing entitlement: ai");
    expect(analyze).not.toHaveBeenCalled();
  });
});
