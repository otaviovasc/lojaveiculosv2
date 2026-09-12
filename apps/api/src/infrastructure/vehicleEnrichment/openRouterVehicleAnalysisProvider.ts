import type {
  InventoryResaleAnalysisRequest,
  InventoryResaleAnalysisResponse,
} from "../../domains/vehicle/ports/vehicleEnrichmentTypes.js";
import {
  asRecord,
  extractOpenRouterResponseOutputText,
} from "../openRouterResponses.js";
import { InventoryEnrichmentProviderError } from "./inventoryEnrichmentProviderError.js";
import { createVehicleMarketContext } from "./vehicleMarketSignals.js";
import type { VehicleResaleAnalysisProvider } from "../../domains/vehicle/ports/vehicleResaleAnalysisProvider.js";
import { defaultOpenRouterModel } from "../openRouterConfig.js";

const responsesUrl = "https://openrouter.ai/api/v1/responses";

export function createOpenRouterVehicleAnalysisProvider({
  apiKey,
  fetch = globalThis.fetch,
  model = defaultOpenRouterModel,
}: {
  apiKey?: string | undefined;
  fetch?: typeof globalThis.fetch;
  model?: string;
} = {}): VehicleResaleAnalysisProvider {
  return {
    model,
    name: "openrouter",
    async analyze(input) {
      if (!apiKey) {
        throw new InventoryEnrichmentProviderError(
          "OPENROUTER_API_KEY is not configured.",
          503,
        );
      }

      const response = await fetch(responsesUrl, {
        body: JSON.stringify(createOpenRouterRequest(model, input)),
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

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw invalidResponseError();
      }
      return parseAnalysisResponse(payload);
    },
  };
}

function createOpenRouterRequest(
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
        type: "message",
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
        type: "message",
      },
    ],
    max_output_tokens: 1200,
    model,
    provider: {
      data_collection: "deny",
      require_parameters: true,
    },
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
  const outputText = extractOpenRouterResponseOutputText(payload);
  if (!outputText) {
    throw new InventoryEnrichmentProviderError(
      "AI resale analysis returned no text.",
      502,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw invalidResponseError();
  }
  if (!isAnalysisResponse(parsed)) {
    throw invalidResponseError();
  }
  return parsed;
}

function invalidResponseError() {
  return new InventoryEnrichmentProviderError(
    "AI resale analysis returned an invalid response.",
    502,
  );
}

function isAnalysisResponse(
  value: unknown,
): value is InventoryResaleAnalysisResponse {
  const record = asRecord(value);
  const score = record?.dealRiskScore;
  return (
    typeof record?.summary === "string" &&
    typeof score === "number" &&
    Number.isInteger(score) &&
    score >= 0 &&
    score <= 100 &&
    typeof record.riskLevel === "string" &&
    ["low", "medium", "high"].includes(record.riskLevel) &&
    Array.isArray(record.topics) &&
    record.topics.every(isAnalysisTopic) &&
    typeof record.suggestedDescription === "string"
  );
}

function isAnalysisTopic(value: unknown) {
  const record = asRecord(value);
  return (
    typeof record?.message === "string" &&
    typeof record.title === "string" &&
    typeof record.code === "string" &&
    ["L", "N", "W"].includes(record.code) &&
    typeof record.type === "string" &&
    ["negative", "neutral", "positive"].includes(record.type)
  );
}
