import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOpenAiVehicleAnalysisProvider } from "./openAiVehicleAnalysisProvider.js";
import {
  baseInput,
  createFetchMock,
  defaultAnalysis,
  requiredSchemaFields,
  systemPrompt,
  topicCodeEnum,
  userPayload,
} from "./openAiVehicleAnalysisProvider.testSupport.js";
import type { InventoryResaleAnalysisResponse } from "../../features/inventory/controllers/inventoryEnrichmentTypes.js";

describe("OpenAI vehicle analysis provider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("OpenAI tests must not use global fetch.");
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests structured resale analysis and parses the response", async () => {
    const analysis = {
      dealRiskScore: 48,
      riskLevel: "medium",
      suggestedDescription: "Fiat Strada Ranch 2023 com boa liquidez.",
      summary: "Boa liquidez, com atencao ao km.",
      topics: [
        {
          code: "W",
          message: "Strada costuma girar bem no mercado brasileiro.",
          title: "Liquidez forte",
          type: "positive",
        },
        {
          code: "N",
          message: "Contexto neutro para acompanhamento da loja.",
          title: "Ponto de atencao",
          type: "neutral",
        },
      ],
    } satisfies InventoryResaleAnalysisResponse;
    const { calls, fetchMock } = createFetchMock(analysis);
    const provider = createOpenAiVehicleAnalysisProvider({
      apiKey: "openai-key",
      fetch: fetchMock,
      model: "gpt-test",
    });

    const result = await provider.analyze(baseInput());

    expect(result).toEqual(analysis);
    expect(calls[0]?.headers).toMatchObject({
      Authorization: "Bearer openai-key",
    });
    expect(calls[0]?.body).toMatchObject({
      model: "gpt-test",
      text: {
        format: {
          name: "vehicle_resale_analysis",
          strict: true,
          type: "json_schema",
        },
      },
    });
    expect(topicCodeEnum(calls[0]?.body)).toEqual(["W", "L", "N"]);
    expect(requiredSchemaFields(calls[0]?.body)).toContain("dealRiskScore");
    expect(systemPrompt(calls[0]?.body)).toContain("dealRiskScore de 0 a 100");
  });

  it("does not use global fetch in tests or validation paths", async () => {
    const fetchMock: typeof globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ output_text: JSON.stringify(defaultAnalysis()) }),
      );
    const provider = createOpenAiVehicleAnalysisProvider({
      apiKey: "openai-key",
      fetch: fetchMock,
    });

    await expect(provider.analyze(baseInput())).resolves.toMatchObject({
      dealRiskScore: 50,
    });
  });

  it("adds Chinese 0km pressure for recent SUVs in the 150k-250k band", async () => {
    const { calls, fetchMock } = createFetchMock();
    const provider = createOpenAiVehicleAnalysisProvider({
      apiKey: "openai-key",
      fetch: fetchMock,
    });

    await provider.analyze(
      baseInput({
        acquisitionPriceCents: 15400000,
        bodyType: "SUV",
        brand: "Jeep",
        fipePriceCents: 19000000,
        model: "Compass",
        recommendedAcquisitionPriceCents: 15580000,
        recommendedSellingPriceCents: 18430000,
        sellingPriceCents: 18800000,
        version: "Longitude",
      }),
    );

    const payload = userPayload(calls[0]?.body);
    expect(payload.vehicle.marketContext).toMatchObject({
      priceBand: "150k_250k",
      segment: "SUV/crossover",
    });
    expect(payload.vehicle.marketContext.signals).toContainEqual(
      expect.objectContaining({
        code: "chinese_new_vehicle_pressure",
        severity: "risk",
      }),
    );
  });

  it("does not add Chinese 0km pressure to cheaper pickup inventory", async () => {
    const { calls, fetchMock } = createFetchMock();
    const provider = createOpenAiVehicleAnalysisProvider({
      apiKey: "openai-key",
      fetch: fetchMock,
    });

    await provider.analyze(baseInput());

    const signalCodes = userPayload(
      calls[0]?.body,
    ).vehicle.marketContext.signals.map((signal) => signal.code);
    expect(signalCodes).not.toContain("chinese_new_vehicle_pressure");
  });

  it("flags explicit rental metadata without requiring the model to invent history", async () => {
    const { calls, fetchMock } = createFetchMock();
    const provider = createOpenAiVehicleAnalysisProvider({
      apiKey: "openai-key",
      fetch: fetchMock,
    });

    await provider.analyze(
      baseInput({
        bodyType: "SUV",
        brand: "Jeep",
        metadata: [{ label: "Uso anterior", value: "Aluguel" }],
        model: "Compass",
        sellingPriceCents: 18800000,
      }),
    );

    expect(systemPrompt(calls[0]?.body)).toContain(
      "nao afirme passagem por locadora sem dado explicito",
    );
    expect(
      userPayload(calls[0]?.body).vehicle.marketContext.signals,
    ).toContainEqual(
      expect.objectContaining({ code: "possible_rental_history" }),
    );
  });

  it("adds consignment strategy context when purchase risk is capital-heavy", async () => {
    const { calls, fetchMock } = createFetchMock();
    const provider = createOpenAiVehicleAnalysisProvider({
      apiKey: "openai-key",
      fetch: fetchMock,
    });

    await provider.analyze(
      baseInput({
        acquisitionPriceCents: 18400000,
        bodyType: "SUV",
        brand: "Jeep",
        fipePriceCents: 19000000,
        model: "Compass",
        recommendedAcquisitionPriceCents: 15580000,
        sellingPriceCents: 18800000,
      }),
    );

    expect(systemPrompt(calls[0]?.body)).toContain("signal de consignado");
    expect(
      userPayload(calls[0]?.body).vehicle.marketContext.signals,
    ).toContainEqual(
      expect.objectContaining({
        code: "consignment_strategy_context",
        severity: "watch",
      }),
    );
  });

  it("keeps consignment context off clean low-ticket deals", async () => {
    const { calls, fetchMock } = createFetchMock();
    const provider = createOpenAiVehicleAnalysisProvider({
      apiKey: "openai-key",
      fetch: fetchMock,
    });

    await provider.analyze(baseInput());

    const signalCodes = userPayload(
      calls[0]?.body,
    ).vehicle.marketContext.signals.map((signal) => signal.code);
    expect(signalCodes).not.toContain("consignment_strategy_context");
  });
});
