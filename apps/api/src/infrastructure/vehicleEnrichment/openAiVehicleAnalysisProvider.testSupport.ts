import type {
  InventoryResaleAnalysisRequest,
  InventoryResaleAnalysisResponse,
} from "../../features/inventory/controllers/inventoryEnrichmentTypes.js";

export function createFetchMock(
  analysis: InventoryResaleAnalysisResponse = defaultAnalysis(),
) {
  const calls: Array<{ body: unknown; headers: HeadersInit | undefined }> = [];
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
  return { calls, fetchMock };
}

export function defaultAnalysis(): InventoryResaleAnalysisResponse {
  return {
    dealRiskScore: 50,
    riskLevel: "medium",
    suggestedDescription: "Descricao gerada.",
    summary: "Analise gerada.",
    topics: [
      {
        code: "N",
        message: "Contexto neutro retornado.",
        title: "Contexto",
        type: "neutral",
      },
    ],
  };
}

export function baseInput(
  overrides: Partial<InventoryResaleAnalysisRequest> = {},
): InventoryResaleAnalysisRequest {
  return {
    acquisitionPriceCents: 8000000,
    bodyType: null,
    brand: "Fiat",
    city: null,
    color: "Branca",
    fipePriceCents: 10000000,
    fuel: "Flex",
    manufactureYear: 2023,
    marketContext: null,
    metadata: [],
    mileageKm: 60000,
    model: "Strada",
    modelYear: 2023,
    origin: "Nacional",
    plate: "ABC1D23",
    recommendedAcquisitionPriceCents: 8200000,
    recommendedSellingPriceCents: 9700000,
    sellingPriceCents: 9600000,
    state: null,
    transmission: "Automatica",
    vehicleType: "Automovel",
    version: "Ranch",
    ...overrides,
  };
}

export function userPayload(body: unknown): CapturedUserPayload {
  const request = body as CapturedRequest;
  const parsed: unknown = JSON.parse(
    request.input[1]?.content[0]?.text ?? "{}",
  );
  return parsed as CapturedUserPayload;
}

export function systemPrompt(body: unknown) {
  const request = body as CapturedRequest;
  return request.input[0]?.content[0]?.text ?? "";
}

export function topicCodeEnum(body: unknown) {
  const request = body as CapturedRequest;
  return request.text.format.schema.properties.topics.items.properties.code
    .enum;
}

export function requiredSchemaFields(body: unknown) {
  const request = body as CapturedRequest & {
    text: { format: { schema: { required: string[] } } };
  };
  return request.text.format.schema.required;
}

type CapturedRequest = {
  input: Array<{ content: Array<{ text: string }>; role: string }>;
  text: {
    format: {
      schema: {
        properties: {
          topics: {
            items: {
              properties: { code: { enum: string[] } };
            };
          };
        };
      };
    };
  };
};

type CapturedUserPayload = {
  vehicle: InventoryResaleAnalysisRequest & {
    marketContext: NonNullable<InventoryResaleAnalysisRequest["marketContext"]>;
  };
};
