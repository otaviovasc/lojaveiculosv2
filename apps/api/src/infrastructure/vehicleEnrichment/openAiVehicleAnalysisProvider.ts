import type {
  InventoryResaleAnalysisRequest,
  InventoryResaleAnalysisResponse,
  InventoryResaleTopic,
} from "../../domains/vehicle/ports/vehicleEnrichmentTypes.js";
import { InventoryEnrichmentProviderError } from "./inventoryEnrichmentProviderError.js";
import { createVehicleMarketContext } from "./vehicleMarketSignals.js";

const defaultModel = "gpt-5.4-mini";
const responsesUrl = "https://api.openai.com/v1/responses";

export type OpenAiVehicleAnalysisProvider = {
  analyze: (
    input: InventoryResaleAnalysisRequest,
  ) => Promise<InventoryResaleAnalysisResponse>;
};

export function createOpenAiVehicleAnalysisProvider({
  apiKey,
  fetch = globalThis.fetch,
  model = defaultModel,
}: {
  apiKey?: string | undefined;
  fetch?: typeof globalThis.fetch;
  model?: string;
} = {}): OpenAiVehicleAnalysisProvider {
  return {
    async analyze(input) {
      if (!apiKey) {
        throw new InventoryEnrichmentProviderError(
          "API_OPENAI_KEY is not configured.",
          503,
        );
      }

      const response = await fetch(responsesUrl, {
        body: JSON.stringify(createOpenAiRequest(model, input)),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new InventoryEnrichmentProviderError(
          `AI resale analysis failed with status ${response.status}.`,
          response.status === 401 || response.status === 403 ? 502 : 503,
        );
      }

      return parseAnalysisResponse(await response.json());
    },
  };
}

function createOpenAiRequest(
  model: string,
  input: InventoryResaleAnalysisRequest,
) {
  const vehicle = {
    ...input,
    marketContext: createVehicleMarketContext(input),
  };

  return {
    input: [
      {
        content: [
          {
            text: [
              "Voce e um avaliador comercial de loja brasileira de seminovos.",
              "Analise liquidez, risco de margem, FIPE, km por ano, cor, cambio, combustivel e versao.",
              "O objetivo principal e gerar um dealRiskScore de 0 a 100, onde 0 e risco muito baixo e 100 e risco muito alto para a loja.",
              "Mantenha riskLevel coerente: low 0-33, medium 34-66, high 67-100.",
              "Use codigos W para pontos positivos, L para riscos e N para contexto neutro/observacao.",
              "Gere 4 a 7 topicos e inclua topicos N somente quando eles adicionarem contexto util.",
              "Use marketContext.signals quando existirem. Sem signal, nao mencione 0 km chines ou locadora.",
              "Se houver signal de locadora/frota, nao afirme passagem por locadora sem dado explicito.",
              "Na faixa R$ 150 mil a R$ 250 mil, avalie pressao de 0 km chines apenas quando o signal existir.",
              "Se houver signal de consignado, avalie se consignado bem contratado reduziria risco de capital, sem tratar como recomendacao juridica.",
              "Seja pratico, especifico e escreva em portugues do Brasil.",
              "Nao invente historico, unico dono, revisoes, blindagem ou estado de conservacao sem dados.",
            ].join(" "),
            type: "input_text",
          },
        ],
        role: "system",
      },
      {
        content: [
          {
            text: JSON.stringify({
              businessRules: {
                recommendedAcquisition: "18% abaixo da FIPE",
                recommendedSelling: "3% abaixo da FIPE",
              },
              vehicle,
            }),
            type: "input_text",
          },
        ],
        role: "user",
      },
    ],
    max_output_tokens: 1200,
    model,
    text: {
      format: {
        name: "vehicle_resale_analysis",
        schema: analysisSchema,
        strict: true,
        type: "json_schema",
      },
    },
  };
}

const analysisSchema = {
  additionalProperties: false,
  properties: {
    dealRiskScore: { maximum: 100, minimum: 0, type: "integer" },
    riskLevel: { enum: ["low", "medium", "high"], type: "string" },
    suggestedDescription: { type: "string" },
    summary: { type: "string" },
    topics: {
      items: {
        additionalProperties: false,
        properties: {
          code: { enum: ["W", "L", "N"], type: "string" },
          message: { type: "string" },
          title: { type: "string" },
          type: { enum: ["positive", "negative", "neutral"], type: "string" },
        },
        required: ["type", "code", "title", "message"],
        type: "object",
      },
      type: "array",
    },
  },
  required: [
    "summary",
    "riskLevel",
    "dealRiskScore",
    "topics",
    "suggestedDescription",
  ],
  type: "object",
};

function parseAnalysisResponse(
  payload: unknown,
): InventoryResaleAnalysisResponse {
  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new InventoryEnrichmentProviderError(
      "AI resale analysis returned no text.",
      502,
    );
  }

  const parsed = JSON.parse(outputText) as InventoryResaleAnalysisResponse;
  if (!isAnalysisResponse(parsed)) {
    throw new InventoryEnrichmentProviderError(
      "AI resale analysis returned an invalid shape.",
      502,
    );
  }
  return parsed;
}

function extractOutputText(payload: unknown): string | null {
  const record = asRecord(payload);
  if (!record) return null;
  if (typeof record.output_text === "string") return record.output_text;
  const output = Array.isArray(record.output) ? record.output : [];
  for (const item of output) {
    const itemRecord = asRecord(item);
    const content = Array.isArray(itemRecord?.content)
      ? itemRecord.content
      : [];
    for (const part of content) {
      const partRecord = asRecord(part);
      if (typeof partRecord?.text === "string") return partRecord.text;
    }
  }
  return null;
}

function isAnalysisResponse(
  value: InventoryResaleAnalysisResponse,
): value is InventoryResaleAnalysisResponse {
  return (
    typeof value.summary === "string" &&
    Number.isInteger(value.dealRiskScore) &&
    value.dealRiskScore >= 0 &&
    value.dealRiskScore <= 100 &&
    ["low", "medium", "high"].includes(value.riskLevel) &&
    Array.isArray(value.topics) &&
    value.topics.every(isAnalysisTopic) &&
    typeof value.suggestedDescription === "string"
  );
}

function isAnalysisTopic(value: InventoryResaleTopic) {
  return (
    value &&
    typeof value.message === "string" &&
    typeof value.title === "string" &&
    ["L", "N", "W"].includes(value.code) &&
    ["negative", "neutral", "positive"].includes(value.type)
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
