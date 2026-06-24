import { describe, expect, it } from "vitest";
import { createOpenAiVehicleAnalysisProvider } from "./openAiVehicleAnalysisProvider.js";

describe("OpenAI vehicle analysis provider", () => {
  it("requests structured resale analysis and parses the response", async () => {
    const calls: Array<{ body: unknown; headers: HeadersInit | undefined }> =
      [];
    const analysis = {
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
      ],
    };
    const fetchMock: typeof globalThis.fetch = async (_input, init) => {
      calls.push({
        body: JSON.parse(String(init?.body)),
        headers: init?.headers,
      });
      return new Response(
        JSON.stringify({
          output: [{ content: [{ text: JSON.stringify(analysis) }] }],
        }),
      );
    };
    const provider = createOpenAiVehicleAnalysisProvider({
      apiKey: "openai-key",
      fetch: fetchMock,
      model: "gpt-test",
    });

    const result = await provider.analyze({
      acquisitionPriceCents: 8000000,
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
    });

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
  });
});
